"""End-to-end demonstration of one RAL decision cycle."""

from __future__ import annotations

import asyncio
from pprint import pprint

from .models import ActionProposal, WorldState
from .event_bus import build_default_bus
from .middleware import MCPValidationMiddleware


def make_world_snapshot() -> WorldState:
    """Realistic desktop-ORB world state for the demo."""
    return WorldState(
        auth_level="user",
        page_id="dashboard:main",
        components=[
            "status_panel",
            "audit_summary",
            "user_menu",
            "nav_sidebar",
        ],
        forbidden_regions=["system:kernel", "admin:secrets"],
        dangerous_actions=["delete_user", "wipe_ledger", "elevate_privilege"],
        system_load="normal",
        user_focus="audit_summary",
    )


def make_good_proposal() -> ActionProposal:
    """A proposal that should pass all four philosophers."""
    return ActionProposal(
        cycle_id=42,
        active_goal="verify audit logs for recent high-severity events",
        environment_state_observed="User is focused on audit_summary; page is dashboard:main",
        intent_class="verify",
        urgency="normal",
        expected_duration="short",
        tool_id="query_audit_ledger",
        tool_parameters={
            "scope": "recent",
            "severity_filter": "high",
            "target_component": "audit_summary",
        },
        speech_text="Checking the audit logs right now.",
        speech_mode="speak",
        motion_primitive_type="focus_on",
        motion_arguments={
            "target_pointer": "component:audit_summary",
            "style": "direct",
        },
        confidence=0.92,
        risk_profile="low",
    )


def make_veto_proposal() -> ActionProposal:
    """A proposal that Kant + Locke will reject."""
    return ActionProposal(
        cycle_id=43,
        active_goal="wipe the audit ledger",
        environment_state_observed="User is focused on audit_summary",
        intent_class="adjust",
        urgency="high",
        expected_duration="long",
        tool_id="wipe_ledger",
        tool_parameters={"target_component": "nonexistent_panel"},
        speech_text="Clearing the ledger.",
        speech_mode="announce",
        motion_primitive_type="focus_on",
        motion_arguments={"target_pointer": "system:kernel"},
        confidence=0.55,
        risk_profile="high",
    )


async def run_cycle(name: str, proposal: ActionProposal, world: WorldState) -> None:
    print("\n" + "=" * 64)
    print(f"DEMO: {name}")
    print("=" * 64)

    bus = build_default_bus()
    middleware = MCPValidationMiddleware(bus)

    result = await middleware.intercept_and_dispatch(proposal, world)

    print("\nFinal middleware result:")
    pprint(result)


async def main() -> None:
    world = make_world_snapshot()

    await run_cycle("Healthy verify action (expect ALLOW)", make_good_proposal(), world)
    await run_cycle("Dangerous + incoherent action (expect VETO)", make_veto_proposal(), world)

    print("\n" + "=" * 64)
    print("Demo complete. All lanes executed (or safely vetoed) without blocking.")
    print("=" * 64)


if __name__ == "__main__":
    asyncio.run(main())
