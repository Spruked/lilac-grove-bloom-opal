"""Bridge node with injectable I/O. Swap FakeNats/FakeRos for real clients."""

from __future__ import annotations

import time
from typing import Any, Callable, Dict, List, Optional, Protocol

from .mapping import FORBIDDEN_NATS_SUB, MappingTable
from .messages import Envelope, validate_envelope


class NatsClient(Protocol):
    def publish(self, subject: str, payload: Dict[str, Any]) -> None: ...
    def subscribe(self, subject: str, handler: Callable[[str, Dict[str, Any]], None]) -> None: ...


class RosClient(Protocol):
    def publish_topic(self, name: str, msg: Dict[str, Any]) -> None: ...
    def send_action(self, name: str, goal: Dict[str, Any], preempt: bool = False) -> None: ...
    def cancel_action(self, name: str) -> None: ...
    def call_service(self, name: str, req: Dict[str, Any]) -> None: ...


class FakeNats:
    def __init__(self) -> None:
        self.published: List[tuple[str, Dict[str, Any]]] = []
        self._subs: Dict[str, List[Callable[[str, Dict[str, Any]], None]]] = {}

    def publish(self, subject: str, payload: Dict[str, Any]) -> None:
        self.published.append((subject, payload))
        for pat, handlers in self._subs.items():
            if _match(pat, subject):
                for h in handlers:
                    h(subject, payload)

    def subscribe(self, subject: str, handler: Callable[[str, Dict[str, Any]], None]) -> None:
        self._subs.setdefault(subject, []).append(handler)


class FakeRos:
    def __init__(self) -> None:
        self.topics: List[tuple[str, Dict[str, Any]]] = []
        self.actions: List[tuple[str, Dict[str, Any], bool]] = []
        self.cancels: List[str] = []
        self.services: List[tuple[str, Dict[str, Any]]] = []

    def publish_topic(self, name: str, msg: Dict[str, Any]) -> None:
        self.topics.append((name, msg))

    def send_action(self, name: str, goal: Dict[str, Any], preempt: bool = False) -> None:
        self.actions.append((name, goal, preempt))

    def cancel_action(self, name: str) -> None:
        self.cancels.append(name)

    def call_service(self, name: str, req: Dict[str, Any]) -> None:
        self.services.append((name, req))


def _match(pattern: str, subject: str) -> bool:
    if pattern == subject:
        return True
    if pattern.endswith(">"):
        return subject.startswith(pattern[:-1])
    return False


class BridgeNode:
    def __init__(
        self,
        robot_id: str,
        nats: NatsClient,
        ros: RosClient,
        world_etag: Optional[str] = None,
    ) -> None:
        self.robot_id = robot_id
        self.nats = nats
        self.ros = ros
        self.table = MappingTable()
        self.world_etag = world_etag
        self.dropped: List[str] = []
        self.nats_connected = True
        self._last_twist_ts = 0.0

    def start(self) -> None:
        prefix = f"ral.{self.robot_id}."
        self.nats.subscribe(prefix + "cmd.motion.>", self._on_cmd)
        self.nats.subscribe(prefix + "cmd.estop", self._on_cmd)

    def _on_cmd(self, subject: str, raw: Dict[str, Any]) -> None:
        if any(tok in subject for tok in FORBIDDEN_NATS_SUB):
            self.dropped.append(f"forbidden subject {subject}")
            return
        try:
            env = validate_envelope(raw)
        except ValueError as e:
            self.dropped.append(str(e))
            return
        if env.robot_id != self.robot_id:
            self.dropped.append("robot_id mismatch")
            return
        if env.world_etag is not None and self.world_etag is not None:
            if env.world_etag != self.world_etag:
                self.dropped.append("stale world_etag")
                return
        primitive = env.payload.get("primitive_type") or env.payload.get("type")
        if subject.endswith("cmd.estop"):
            primitive = "estop"
        if not primitive:
            self.dropped.append("missing primitive_type")
            return
        mapping = self.table.lookup(str(primitive))
        if mapping is None:
            self.dropped.append(f"unknown primitive {primitive}")
            return
        self._dispatch(mapping.primitive_type, env)

    def _dispatch(self, primitive: str, env: Envelope) -> None:
        goal = dict(env.payload)
        goal["cycle_id"] = env.cycle_id
        if primitive == "estop":
            self.ros.call_service("/emergency_stop", {"cycle_id": env.cycle_id})
            self.ros.cancel_action("/navigate_to_pose")
            self.ros.cancel_action("/arm_controller/follow_joint_trajectory")
            self.ros.publish_topic("/cmd_vel", {"linear": 0, "angular": 0, "zero": True})
            return
        if primitive == "idle_in_region":
            self.ros.cancel_action("/navigate_to_pose")
            self.ros.publish_topic("/cmd_vel", {"linear": 0, "angular": 0, "zero": True})
            return
        if primitive == "twist_base":
            now = time.monotonic()
            if now - self._last_twist_ts < 1.0 / 20.0:
                return
            self._last_twist_ts = now
            self.ros.publish_topic("/cmd_vel", goal)
            return
        mapping = self.table.lookup(primitive)
        assert mapping is not None
        ros = mapping.ros
        if ros["kind"] == "action":
            self.ros.send_action(ros["name"], goal, preempt=bool(mapping.ros.get("preempt") or primitive in ("nav_to_pose", "arm_follow")))
        elif ros["kind"] == "topic":
            self.ros.publish_topic(ros["name"], goal)

    def on_joint_states(self, msg: Dict[str, Any]) -> None:
        if self.table.is_forbidden_ros("/joint_states"):
            return
        self.nats.publish(
            f"ral.{self.robot_id}.tel.motion.joints",
            {
                "robot_id": self.robot_id,
                "schema": "tti.tel.joints.v1",
                "payload": {k: msg[k] for k in msg if k != "effort"},
            },
        )

    def on_nats_disconnect(self) -> None:
        self.nats_connected = False
        self.ros.cancel_action("/navigate_to_pose")
        self.ros.publish_topic("/cmd_vel", {"linear": 0, "angular": 0, "zero": True})

    def on_joints_timeout(self) -> None:
        self.nats.publish(
            f"ral.{self.robot_id}.tel.health",
            {
                "robot_id": self.robot_id,
                "schema": "tti.tel.health.v1",
                "payload": {"status": "actuators_lost"},
            },
        )
