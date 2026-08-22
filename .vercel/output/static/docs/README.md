# ral_ros_bridge

Dumb I/O between the **NATS skill bus** (RAL / Core-4) and **ROS 2** (drivers, TF, controllers).

The bridge **never** evaluates Core-4. It never accepts commands from the LLM account. It maps an allow-listed table of NATS primitives → ROS actions/topics, rate-limits telemetry, and stamps every envelope with `cycle_id` + `robot_time`.

```
ROS 2  = muscles and senses
NATS   = nerves (skills, verdicts, world-state watches)
Core-4 = law (runs elsewhere, request/reply)
PLC    = spinal cord (e-stop is not this node's job)
```

## Layout

```
ral_ros_bridge/
├── SPEC.md                 Full contract
├── mapping.yaml            Primitive → ROS mapping (source of truth)
├── subjects.yaml           Subject tree
├── rates.yaml              Rate limits + latency SLOs + stub bench
├── nats/accounts.conf      nkey / account ACLs
├── schemas/                JSON schemas
└── ral_ros_bridge/         Python stub (no ROS/NATS required to unit-test)
    ├── messages.py
    ├── mapping.py
    ├── node.py
    ├── demo.py
    └── bench.py            In-process hop latency
```

## Run the stub demo

```bash
python -m ral_ros_bridge.demo
python -m ral_ros_bridge.bench
```

Python 3.10+, stdlib only. Fakes only — no ROS, no nats-server. Bench fails if in-process p99 exceeds 200 µs.
