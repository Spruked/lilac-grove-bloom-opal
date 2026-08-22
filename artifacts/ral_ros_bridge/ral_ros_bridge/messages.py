from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class RobotTime:
    sec: int
    nsec: int


@dataclass
class Envelope:
    event_id: str
    robot_id: str
    cycle_id: int
    schema: str
    payload: Dict[str, Any]
    task_id: str = "unknown"
    priority: str = "normal"
    robot_time: Optional[RobotTime] = None
    world_etag: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {
            "event_id": self.event_id,
            "robot_id": self.robot_id,
            "task_id": self.task_id,
            "cycle_id": self.cycle_id,
            "schema": self.schema,
            "priority": self.priority,
            "world_etag": self.world_etag,
            "payload": self.payload,
        }
        if self.robot_time:
            d["robot_time"] = {"sec": self.robot_time.sec, "nsec": self.robot_time.nsec}
        return d


def validate_envelope(raw: Dict[str, Any]) -> Envelope:
    missing = [k for k in ("event_id", "robot_id", "cycle_id", "schema", "payload") if k not in raw]
    if missing:
        raise ValueError(f"invalid envelope, missing {missing}")
    if not isinstance(raw["cycle_id"], int):
        raise ValueError("cycle_id must be int")
    rt = raw.get("robot_time")
    robot_time = None
    if isinstance(rt, dict) and "sec" in rt and "nsec" in rt:
        robot_time = RobotTime(sec=int(rt["sec"]), nsec=int(rt["nsec"]))
    return Envelope(
        event_id=str(raw["event_id"]),
        robot_id=str(raw["robot_id"]),
        cycle_id=int(raw["cycle_id"]),
        schema=str(raw["schema"]),
        payload=dict(raw["payload"]),
        task_id=str(raw.get("task_id", "unknown")),
        priority=str(raw.get("priority", "normal")),
        robot_time=robot_time,
        world_etag=None if raw.get("world_etag") is None else str(raw["world_etag"]),
    )
