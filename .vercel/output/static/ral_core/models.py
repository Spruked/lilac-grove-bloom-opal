"""Core data structures for the Real-Time Agency Loop."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

Verdict = Literal["allow", "veto", "revise", "ask"]
AuthLevel = Literal["none", "user", "admin"]
RiskProfile = Literal["low", "medium", "high"]
SystemLoad = Literal["low", "normal", "high"]
IntentClass = Literal["explore", "secure", "retrieve", "adjust", "guide", "verify"]
Urgency = Literal["low", "normal", "high"]
Duration = Literal["instant", "short", "long"]
SpeechMode = Literal["speak", "whisper_hint", "announce", "silent"]
MotionPrimitiveType = Literal["servo_orbit", "focus_on", "idle_in_region", "smooth_glide"]


@dataclass
class PhilosopherResult:
    name: str
    verdict: Verdict
    reasons: List[str] = field(default_factory=list)


@dataclass
class WorldState:
    """Read-only snapshot of the environment at decision time."""
    auth_level: AuthLevel = "user"
    page_id: str = ""
    components: List[str] = field(default_factory=list)
    forbidden_regions: List[str] = field(default_factory=list)
    dangerous_actions: List[str] = field(default_factory=list)
    system_load: SystemLoad = "normal"
    user_focus: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ActionProposal:
    """Strict payload the LLM must emit every RAL cycle."""
    cycle_id: int
    active_goal: str
    environment_state_observed: str
    intent_class: IntentClass
    urgency: Urgency
    expected_duration: Duration
    tool_id: str
    tool_parameters: Dict[str, Any]
    speech_text: str
    speech_mode: SpeechMode
    motion_primitive_type: MotionPrimitiveType
    motion_arguments: Dict[str, Any]
    confidence: float = 0.8
    risk_profile: RiskProfile = "low"

    def to_tool_payload(self) -> Dict[str, Any]:
        return {
            "tool_id": self.tool_id,
            "parameters": self.tool_parameters,
            "cycle_id": self.cycle_id,
            "intent_class": self.intent_class,
        }

    def to_speech_payload(self) -> Dict[str, Any]:
        return {
            "text": self.speech_text,
            "mode": self.speech_mode,
            "cycle_id": self.cycle_id,
        }

    def to_motion_payload(self) -> Dict[str, Any]:
        return {
            "primitive_type": self.motion_primitive_type,
            "arguments": self.motion_arguments,
            "cycle_id": self.cycle_id,
        }


@dataclass
class TribunalVerdict:
    final_verdict: Verdict
    results: List[PhilosopherResult]
    cycle_id: int

    @property
    def approved(self) -> bool:
        return self.final_verdict == "allow"
