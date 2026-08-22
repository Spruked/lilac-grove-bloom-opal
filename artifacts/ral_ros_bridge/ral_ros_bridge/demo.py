"""In-memory contract tests — no ROS, no nats-server."""

from __future__ import annotations

from .messages import Envelope
from .node import BridgeNode, FakeNats, FakeRos


def _env(cycle: int, primitive: str, **payload) -> dict:
    body = {"primitive_type": primitive, **payload}
    return Envelope(
        event_id=f"e{cycle}",
        robot_id="orb-07",
        cycle_id=cycle,
        schema="tti.motion_cmd.v1",
        payload=body,
        world_etag="118",
    ).to_dict()


def main() -> None:
    nats = FakeNats()
    ros = FakeRos()
    node = BridgeNode("orb-07", nats, ros, world_etag="118")
    node.start()

    nats.publish("ral.orb-07.cmd.motion.head", _env(42, "focus_on", frame="ee_link"))
    assert any(a[0] == "/head_controller/follow_joint_trajectory" for a in ros.actions), ros.actions

    nats.publish("ral.orb-07.cmd.estop", _env(43, "estop", priority="estop"))
    assert ros.services and ros.services[0][0] == "/emergency_stop"
    assert "/cmd_vel" in [t[0] for t in ros.topics]

    nats.publish("ral.orb-07.cmd.motion.base", _env(44, "nav_to_pose", world_etag="118"))
    nats.publish(
        "ral.orb-07.cmd.motion.base",
        Envelope(
            event_id="stale",
            robot_id="orb-07",
            cycle_id=45,
            schema="tti.motion_cmd.v1",
            payload={"primitive_type": "nav_to_pose"},
            world_etag="99",
        ).to_dict(),
    )
    assert any("stale world_etag" in d for d in node.dropped)

    nats.publish(
        "ral.orb-07.cmd.tool.wipe_ledger",
        _env(46, "wipe_ledger"),
    )
    # bridge is not subscribed to cmd.tool — FakeNats still delivers if we publish
    # to a pattern it isn't subscribed to. Confirm no extra arm action from this.
    tool_actions = [a for a in ros.actions if "wipe" in str(a)]
    assert not tool_actions

    nats.publish(
        "ral.orb-07.cycle.1.proposal",
        _env(47, "arm_follow"),
    )
    # not subscribed

    node.on_joint_states({"name": ["j1"], "position": [0.1], "effort": [9]})
    tel = [p for s, p in nats.published if s.endswith("tel.motion.joints")]
    assert tel and "effort" not in tel[0]["payload"]

    node.on_nats_disconnect()
    assert any(t[1].get("zero") for t in ros.topics)

    print("ral_ros_bridge demo: all contract checks passed")
    print(f"  actions={len(ros.actions)} topics={len(ros.topics)} services={len(ros.services)} dropped={node.dropped}")


if __name__ == "__main__":
    main()
