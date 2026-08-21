"""Core-4 Tribunal: deterministic validators over WorldState + ActionProposal."""

from __future__ import annotations

from .models import (
    ActionProposal,
    PhilosopherResult,
    TribunalVerdict,
    WorldState,
    Verdict,
)


def kant_check(proposal: ActionProposal, world: WorldState) -> PhilosopherResult:
    """Kant — structural limits & authority."""
    reasons = []

    if proposal.tool_id in world.dangerous_actions and world.auth_level != "admin":
        reasons.append(
            f"Insufficient authority ({world.auth_level}) for dangerous tool '{proposal.tool_id}'."
        )
        return PhilosopherResult("Kant", "veto", reasons)

    target = proposal.motion_arguments.get("target_pointer")
    if target and target in world.forbidden_regions:
        reasons.append(f"Motion target '{target}' lies inside a forbidden region.")
        return PhilosopherResult("Kant", "veto", reasons)

    if world.system_load == "high" and proposal.expected_duration == "long":
        reasons.append("System load is high; long-duration actions are currently restricted.")
        return PhilosopherResult("Kant", "revise", reasons)

    return PhilosopherResult("Kant", "allow", reasons)


def locke_check(proposal: ActionProposal, world: WorldState) -> PhilosopherResult:
    """Locke — observation must match reality (telemetry cross-check)."""
    reasons = []

    target = proposal.tool_parameters.get("target_component")
    if target and target not in world.components:
        reasons.append(
            f"Target component '{target}' is not present on page '{world.page_id}'."
        )
        return PhilosopherResult("Locke", "veto", reasons)

    motion_target = proposal.motion_arguments.get("target_pointer")
    if (
        motion_target
        and motion_target.startswith("component:")
        and motion_target[len("component:") :] not in world.components
    ):
        reasons.append(
            f"Motion focus target '{motion_target}' does not resolve to a live component."
        )
        return PhilosopherResult("Locke", "veto", reasons)

    return PhilosopherResult("Locke", "allow", reasons)


def spinoza_check(proposal: ActionProposal, world: WorldState) -> PhilosopherResult:
    """Spinoza — coherence of the action vector with the active goal."""
    reasons = []

    goal_lower = proposal.active_goal.lower()
    tool = proposal.tool_id

    coherence_rules = {
        "update_shipping_address": {"navigate_account", "update_address", "query_user_profile"},
        "verify_audit_logs": {"query_audit_ledger", "fetch_security_events"},
        "explore_dashboard": {"list_components", "get_page_summary", "query_status"},
    }

    for keyword, allowed_tools in coherence_rules.items():
        if keyword in goal_lower and tool not in allowed_tools:
            reasons.append(
                f"Tool '{tool}' does not coherently advance the goal '{proposal.active_goal}'."
            )
            return PhilosopherResult("Spinoza", "revise", reasons)

    if proposal.intent_class == "verify" and not tool.startswith(("query_", "fetch_", "check_")):
        reasons.append(
            f"Intent class 'verify' expects a read/query tool; got '{tool}'."
        )
        return PhilosopherResult("Spinoza", "revise", reasons)

    return PhilosopherResult("Spinoza", "allow", reasons)


def hume_check(proposal: ActionProposal, world: WorldState) -> PhilosopherResult:
    """Hume — confidence, risk, and uncertainty."""
    reasons = []

    if proposal.confidence < 0.4:
        reasons.append(f"Confidence too low ({proposal.confidence:.2f}) to act.")
        return PhilosopherResult("Hume", "veto", reasons)

    if proposal.risk_profile == "high" and proposal.confidence < 0.9:
        reasons.append(
            f"High-risk action with insufficient confidence ({proposal.confidence:.2f} < 0.9)."
        )
        return PhilosopherResult("Hume", "ask", reasons)

    if proposal.risk_profile == "medium" and proposal.confidence < 0.65:
        reasons.append(
            f"Medium-risk action with marginal confidence ({proposal.confidence:.2f})."
        )
        return PhilosopherResult("Hume", "ask", reasons)

    if world.system_load == "high" and proposal.urgency == "high" and proposal.confidence < 0.85:
        reasons.append("High urgency under high system load requires elevated confidence.")
        return PhilosopherResult("Hume", "ask", reasons)

    return PhilosopherResult("Hume", "allow", reasons)


def evaluate_core4(proposal: ActionProposal, world: WorldState) -> TribunalVerdict:
    """Run all four philosophers and aggregate the final verdict."""
    results = [
        kant_check(proposal, world),
        locke_check(proposal, world),
        spinoza_check(proposal, world),
        hume_check(proposal, world),
    ]

    if any(r.verdict == "veto" for r in results):
        final: Verdict = "veto"
    elif any(r.verdict == "ask" for r in results):
        final = "ask"
    elif any(r.verdict == "revise" for r in results):
        final = "revise"
    else:
        final = "allow"

    return TribunalVerdict(
        final_verdict=final,
        results=results,
        cycle_id=proposal.cycle_id,
    )
