"""In-process hop latency. Not a robot, not NATS-server, not DDS.

Measures envelope validate + mapping + dispatch on FakeNats/Null I/O.
Onboard budgets live in rates.yaml / SPEC §10. This script only proves the
stub is not the bottleneck.
"""

from __future__ import annotations

import statistics
import time
from typing import Callable, Dict, List

from .messages import Envelope
from .node import BridgeNode, FakeNats


class NullRos:
    def publish_topic(self, name: str, msg: Dict) -> None:
        return

    def send_action(self, name: str, goal: Dict, preempt: bool = False) -> None:
        return

    def cancel_action(self, name: str) -> None:
        return

    def call_service(self, name: str, req: Dict) -> None:
        return


def _pct(xs: List[float], p: float) -> float:
    if not xs:
        return 0.0
    ys = sorted(xs)
    i = min(len(ys) - 1, max(0, int(round((p / 100.0) * (len(ys) - 1)))))
    return ys[i]


def _us(fn: Callable[[], None], n: int, warmup: int = 200) -> List[float]:
    for _ in range(warmup):
        fn()
    out: List[float] = []
    for _ in range(n):
        t0 = time.perf_counter_ns()
        fn()
        out.append((time.perf_counter_ns() - t0) / 1000.0)
    return out


def _env(cycle: int, primitive: str, etag: str = "118") -> dict:
    return Envelope(
        event_id=f"e{cycle}",
        robot_id="orb-07",
        cycle_id=cycle,
        schema="tti.motion_cmd.v1",
        payload={"primitive_type": primitive},
        world_etag=etag,
    ).to_dict()


def run(n: int = 8000) -> Dict[str, Dict[str, float]]:
    nats = FakeNats()
    node = BridgeNode("orb-07", nats, NullRos(), world_etag="118")
    node.start()

    focus = _env(1, "focus_on")
    estop = _env(2, "estop")
    twist = _env(3, "twist_base")
    stale = _env(4, "nav_to_pose", etag="1")
    unknown = _env(5, "teleport")

    def twist_unthrottled() -> None:
        node._last_twist_ts = 0.0
        node._on_cmd("ral.orb-07.cmd.motion.base", twist)

    cases = {
        "focus_on_dispatch": lambda: node._on_cmd("ral.orb-07.cmd.motion.head", focus),
        "estop_dispatch": lambda: node._on_cmd("ral.orb-07.cmd.estop", estop),
        "twist_base_dispatch": twist_unthrottled,
        "stale_etag_drop": lambda: node._on_cmd("ral.orb-07.cmd.motion.base", stale),
        "unknown_primitive_drop": lambda: node._on_cmd("ral.orb-07.cmd.motion.arm", unknown),
    }

    report: Dict[str, Dict[str, float]] = {}
    for name, fn in cases.items():
        samples = _us(fn, n)
        report[name] = {
            "n": float(n),
            "p50_us": round(statistics.median(samples), 2),
            "p99_us": round(_pct(samples, 99), 2),
            "p999_us": round(_pct(samples, 99.9), 2),
            "max_us": round(max(samples), 2),
        }
    return report


def main() -> None:
    report = run()
    print("ral_ros_bridge in-process hop latency (Null I/O, not a robot)")
    print(f"{'path':<28} {'p50 µs':>10} {'p99 µs':>10} {'p999 µs':>10} {'max µs':>10}")
    for name, row in report.items():
        print(
            f"{name:<28} {row['p50_us']:>10.2f} {row['p99_us']:>10.2f} "
            f"{row['p999_us']:>10.2f} {row['max_us']:>10.2f}"
        )
    worst_p99 = max(r["p99_us"] for r in report.values())
    budget_us = 200.0
    print(f"stub p99 budget {budget_us:.0f} µs  measured worst p99 {worst_p99:.2f} µs")
    if worst_p99 > budget_us:
        raise SystemExit("stub exceeded in-process p99 budget — the node is the bottleneck")


if __name__ == "__main__":
    main()
