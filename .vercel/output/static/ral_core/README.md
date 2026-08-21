# RAL Core — Real-Time Agency Loop

Python package for the **Core-4 Tribunal**, **MCP Validation Middleware**, and
**asynchronous event bus** (tool / speech / motion lanes).

## Layout

```
ral_core/
├── models.py        WorldState, ActionProposal, TribunalVerdict
├── core4.py         Kant / Locke / Spinoza / Hume validators
├── event_bus.py     Async pub/sub + concurrent lanes
├── middleware.py    Validation gate + safe fallback
├── demo.py          End-to-end test (ALLOW + VETO)
└── __init__.py
```

## Requirements

- Python 3.10+
- No third-party dependencies

## Run the demo

From the parent directory of `ral_core/`:

```bash
python -m ral_core.demo
```

Expected:

- **Cycle 42** — all four philosophers `ALLOW`, concurrent tool + speech + motion
- **Cycle 43** — `VETO` (dangerous tool + missing component), fallback idle + whisper

## Verdict aggregation

Priority: any `veto` wins, then `ask`, then `revise`, else `allow`.

On a non-`allow` verdict the middleware never invokes tools. It forces:

- speech: `"Standing by. Conditions require verification."` (`whisper_hint`)
- motion: `idle_in_region` with `style: cautious`
