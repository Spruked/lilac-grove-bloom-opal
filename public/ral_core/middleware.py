"""MCP Validation Middleware – the single gate between LLM proposal and actuators."""

from __future__ import annotations

import asyncio
from typing import Any, Dict

from .core4 import evaluate_core4
from .event_bus import EventBus
from .models import ActionProposal, TribunalVerdict, WorldState


class MCPValidationMiddleware:
    def __init__(self, event_bus: EventBus) -> None:
        self.bus = event_bus

    async def intercept_and_dispatch(
        self,
        proposal: ActionProposal,
        world: WorldState,
    ) -> Dict[str, Any]:
        """
        Run Core-4 Tribunal.
        On allow  → concurrent fire-and-forget dispatch to three lanes.
        On veto/ask/revise → safe fallback + return reasons.
        """
        verdict: TribunalVerdict = evaluate_core4(proposal, world)

        print(f"\n─── Cycle {proposal.cycle_id}  Core-4 Verdict: {verdict.final_verdict.upper()} ───")
        for r in verdict.results:
            status = r.verdict.upper()
            reason_str = "; ".join(r.reasons) if r.reasons else "ok"
            print(f"  {r.name:8} → {status:6}  {reason_str}")

        if not verdict.approved:
            return await self._trigger_fallback(verdict)

        await asyncio.gather(
            self.bus.publish("TOOL_INVOKED", proposal.to_tool_payload()),
            self.bus.publish("SPEECH_ENQUEUED", proposal.to_speech_payload()),
            self.bus.publish("MOTION_COMMAND", proposal.to_motion_payload()),
        )

        return {
            "status": "EXECUTING",
            "cycle_id": proposal.cycle_id,
            "verdict": verdict.final_verdict,
        }

    async def _trigger_fallback(self, verdict: TribunalVerdict) -> Dict[str, Any]:
        """Kant/Hume safety interlock – force idle + quiet speech."""
        reasons = []
        for r in verdict.results:
            reasons.extend(r.reasons)

        fallback_speech = {
            "text": "Standing by. Conditions require verification.",
            "mode": "whisper_hint",
            "cycle_id": verdict.cycle_id,
        }
        fallback_motion = {
            "primitive_type": "idle_in_region",
            "arguments": {"style": "cautious"},
            "cycle_id": verdict.cycle_id,
        }

        await asyncio.gather(
            self.bus.publish("SPEECH_ENQUEUED", fallback_speech),
            self.bus.publish("MOTION_COMMAND", fallback_motion),
        )

        return {
            "status": "VETOED" if verdict.final_verdict == "veto" else verdict.final_verdict.upper(),
            "cycle_id": verdict.cycle_id,
            "reasons": reasons,
            "verdict": verdict.final_verdict,
        }
