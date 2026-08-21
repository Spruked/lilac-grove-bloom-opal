"""Asynchronous Event Bus with concurrent execution lanes and telemetry loopback."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, List

Handler = Callable[[Dict[str, Any]], Awaitable[None]]


@dataclass
class TelemetryEvent:
    topic: str
    cycle_id: int
    payload: Dict[str, Any]
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class EventBus:
    """Simple topic-based async pub/sub with concurrent fan-out."""

    def __init__(self) -> None:
        self._subscribers: Dict[str, List[Handler]] = defaultdict(list)
        self.telemetry_log: List[TelemetryEvent] = []

    def subscribe(self, topic: str, handler: Handler) -> None:
        self._subscribers[topic].append(handler)

    async def publish(self, topic: str, payload: Dict[str, Any]) -> None:
        handlers = self._subscribers.get(topic, [])
        cycle_id = payload.get("cycle_id", -1)
        self.telemetry_log.append(
            TelemetryEvent(topic=topic, cycle_id=cycle_id, payload=payload)
        )
        if not handlers:
            return
        await asyncio.gather(*(h(payload) for h in handlers))

    def clear_telemetry(self) -> None:
        self.telemetry_log.clear()


async def tool_lane_handler(payload: Dict[str, Any]) -> None:
    """Simulates MCP tool execution."""
    await asyncio.sleep(0.05)
    result = {
        "status": "ok",
        "tool_id": payload["tool_id"],
        "data": f"mock_result_for_{payload['tool_id']}",
        "cycle_id": payload["cycle_id"],
    }
    print(f"  [TOOL]   executed {payload['tool_id']} → {result['data']}")


async def speech_lane_handler(payload: Dict[str, Any]) -> None:
    """Simulates TTS synthesis + playback."""
    if payload.get("mode") == "silent":
        print(f"  [SPEECH] silent (cycle {payload['cycle_id']})")
        return
    await asyncio.sleep(0.03)
    print(f"  [SPEECH] [{payload['mode']}] \"{payload['text']}\"")


async def motion_lane_handler(payload: Dict[str, Any]) -> None:
    """Simulates motion primitive execution."""
    await asyncio.sleep(0.02)
    print(
        f"  [MOTION] {payload['primitive_type']} "
        f"args={payload.get('arguments', {})}"
    )


async def telemetry_handler(payload: Dict[str, Any]) -> None:
    """Would update WorldState in a full system."""
    print(f"  [TELEM]  {payload}")


def build_default_bus() -> EventBus:
    """Wire the three execution lanes + telemetry."""
    bus = EventBus()
    bus.subscribe("TOOL_INVOKED", tool_lane_handler)
    bus.subscribe("SPEECH_ENQUEUED", speech_lane_handler)
    bus.subscribe("MOTION_COMMAND", motion_lane_handler)
    bus.subscribe("TOOL_PROGRESS", telemetry_handler)
    bus.subscribe("SPEECH_PROGRESS", telemetry_handler)
    bus.subscribe("MOTION_PROGRESS", telemetry_handler)
    return bus
