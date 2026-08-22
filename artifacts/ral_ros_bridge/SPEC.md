# ral_ros_bridge — contract

**ROS 2 is the robot. NATS is the mission. Core-4 is the law. The LLM cannot sign orders.**

This document is the allow-list. If a mapping is not in `mapping.yaml`, the bridge drops it.

---

## 1. Role

The bridge is a **single ROS 2 node** that:

1. Subscribes to a **fixed** set of ROS topics/actions (senses).
2. Publishes **downsampled metadata** onto NATS `tel.*` subjects and writes selected fields into WorldState KV.
3. Subscribes to NATS `cmd.motion.*` / `cmd.estop` (and no other `cmd.*`).
4. Forwards only **allow-listed** primitives to ROS controllers **as actions** (or `/cmd_vel` for the base twist primitive).
5. Holds last-safe or stops if NATS disconnects; never invents joint state if ROS dies.

It does **not**:

- call the tribunal
- subscribe to `*.proposal`
- publish `cmd.tool.*`
- carry raw images, point clouds, or 1 kHz effort commands
- be the e-stop (PLC is). It *mirrors* `cmd.estop` to a ROS service as belt-and-suspenders.

---

## 2. Identity on the wire

Every NATS payload is an envelope:

| Field | Rule |
|---|---|
| `event_id` | UUID |
| `robot_id` | token, matches subject |
| `task_id` | owning RAL task or `"reflex"` |
| `cycle_id` | integer; **required** on all `cmd.*` |
| `schema` | e.g. `tti.motion_cmd.v1` |
| `priority` | `estop` \| `high` \| `normal` \| `background` |
| `robot_time` | `{ sec, nsec }` copied from ROS `/clock` (or `Time.now` if `/use_sim_time` false) |
| `world_etag` | KV revision the planner believed; optional on tel, **required** on cmd |
| `payload` | schema-specific |

Join key for bags + JetStream: `(robot_id, cycle_id, robot_time)`.

---

## 3. Subject tree

See `subjects.yaml`. Wildcards:

- `ral.{robot}.cmd.motion.>` — motion lane (bridge)
- `ral.{robot}.tel.>` — telemetry (bridge publishes)
- `ral.{robot}.cmd.estop` — all actuators + bridge
- `ral.{robot}.ws.changed` — fusion publishes; bridge may publish after KV put
- Tribunal and planner subjects are **not** the bridge’s business

---

## 4. Mapping table

Source of truth: `mapping.yaml`.

Direction **NATS → ROS** (commands):

| primitive_type | NATS subject | ROS interface | Notes |
|---|---|---|---|
| `twist_base` | `cmd.motion.base` | `geometry_msgs/Twist` on `/cmd_vel` | latest-wins; 20 Hz cap |
| `nav_to_pose` | `cmd.motion.base` | `nav2_msgs/action/NavigateToPose` | cancel previous goal on new cycle |
| `focus_on` | `cmd.motion.head` | `control_msgs/action/FollowJointTrajectory` (head) | look-at solved onboard, not in NATS |
| `arm_follow` | `cmd.motion.arm` | `control_msgs/action/FollowJointTrajectory` | |
| `gripper_set` | `cmd.motion.gripper` | gripper action (vendor) | |
| `idle_in_region` | `cmd.motion.base` | zero twist **or** cancel Nav2 | fallback after veto |
| `estop` | `cmd.estop` | `std_srvs/Trigger` `/emergency_stop` + zero all cmd | in addition to PLC |

Direction **ROS → NATS** (telemetry):

| ROS | NATS | Max rate | Payload |
|---|---|---|---|
| `/joint_states` | `tel.motion.joints` | 50 Hz | name, position, velocity (no effort unless listed) |
| `/tf` `base_link`, `ee_link` | KV `WS/{robot}` poses + `tel.motion.pose` | 10 Hz | |
| `/camera/*/image_raw` | **not forwarded** | — | detections → `tel.perception.camera.meta` |
| vision detections | `tel.perception.camera.meta` | 10 Hz | class, score, stamp, frame_id |
| Nav2 status | `tel.nav` | events | |
| `/diagnostics` | `tel.health` | 1 Hz | |
| `/clock` | envelope `robot_time` only | — | |

Unknown `primitive_type` → log + drop. Never “best effort guess.”

---

## 5. Rate limits and coalescing

See `rates.yaml`.

- **Motion cmd (twist):** coalesce to latest sample; do not queue 200 twists.
- **Nav/arm actions:** at most one active goal per body; new `cycle_id` preempts.
- **Telemetry:** downsample; never JetStream the joint stream.
- **E-stop:** no coalesce delay; fan-out immediately.

---

## 6. Failure

| Event | Bridge behavior |
|---|---|
| NATS disconnect | cancel Nav2, publish zero `/cmd_vel`, set `ws.stale=true` if we can still write KV; ROS controllers hold last-safe per their own config |
| ROS `/joint_states` silent > 100 ms | publish `tel.health` `actuators_lost`; **stop publishing fake joints** |
| `world_etag` mismatch vs KV | **drop command** (Locke belongs to tribunal, but the bridge refuses to act on a known-stale etag if KV is readable) |
| Missing `cycle_id` on cmd | drop |
| LLM account publishes `cmd.*` | NATS ACL rejects before the bridge; if it arrives anyway, drop and alarm |

---

## 7. Accounts (nkeys)

See `nats/accounts.conf`.

| Account | Publish | Subscribe |
|---|---|---|
| `LLM` | `ral.*.cycle.*.proposal` only | `ws.changed`, `tel.health` |
| `PLANNER` | `cycle.*.proposal`, `cmd.motion.*`, `cmd.speech`, `cmd.tool.*` **only after local allow** | `verdict`, `tel.>`, `ws.changed` |
| `TRIBUNAL` | `cycle.*.verdict` | `cycle.*.proposal` (request-reply) |
| `BRIDGE` | `tel.>`, `ws.put` (limited keys) | `cmd.motion.>`, `cmd.estop` |
| `ARM_DRIVER` | `tel.motion.arm` | `cmd.motion.arm` — **via ROS, not NATS** (optional) |
| `TOOL_WORKERS` | `tel.tool` | `cmd.tool.*` queue group `tool-workers` |

The LLM account **cannot** publish `cmd.>`. This is Kant at the network layer.

Planner is the only software allowed to publish `cmd.*`, and only after Core-4 `allow`. The bridge trusts ACL + `cycle_id` + mapping.yaml — not the payload’s `intent_class`.

---

## 8. Clock and bags

- Prefer ROS `/clock` as `robot_time`.
- `rosbag2` records ROS side.
- JetStream stream `RAL_CYCLES` records proposal, verdict, and cmd envelopes (not twist samples).
- Align on `(cycle_id, robot_time)`.

---

## 9. Out of scope

- Core-4 implementation (see `ral_core`)
- TTS / speech arbiter
- MCP tool workers
- Leaf-node / fleet topology
- Replacing `rmw` (use DDS or `rmw_zenoh` *inside* ROS; this bus is beside ROS)

---

## 10. Latency budgets

Two clocks, never mixed:

1. **Skill-bus hop** — planner `allow` → NATS core → bridge → ROS interface. This spec.
2. **Physics / safety** — `ros2_control`, EtherCAT, PLC STO. Not this spec. PLC e-stop must not wait on NATS.

Core NATS on a local board is typically **sub-millisecond**; localhost request RTT is on the order of **~80–150 µs**. JetStream adds persistence cost (~0.1–1 ms for small payloads) and is **forbidden on the cmd/estop path**.

### 10.1 Onboard SLOs (one robot, local nats-server, same machine as ROS)

End-to-end = NATS fabric + bridge + ROS client library. Not LLM. Not Nav2 execution.

| Path | Transport | p50 | p99 | max (drop / fail) | Notes |
|---|---|---|---|---|---|
| Core-4 `evaluate()` in-process | function call | < 0.2 ms | < 1 ms | 2 ms | Pure Python over a snapshot |
| Tribunal request-reply | Core NATS RR | < 1 ms | < 2 ms | 5 ms → `ask`/idle | Onboard only |
| `cmd.estop` fan-out | Core NATS, no JS, no queue group | < 0.3 ms | < 1 ms | 2 ms | Mirror only; PLC is faster |
| `twist_base` → `/cmd_vel` | Core NATS + topic | < 1 ms | < 5 ms | 10 ms drop (latest-wins) | 20 Hz cap is separate |
| `focus_on` / `arm_follow` goal accept | Core NATS + ROS action | < 5 ms | < 15 ms | 30 ms cancel | Execution time is not the hop |
| `nav_to_pose` goal accept | Core NATS + Nav2 action | < 5 ms | < 20 ms | 40 ms | Driving the path is seconds |
| Joint tel `50 Hz` | Core NATS | hop < 2 ms | < 5 ms | skip sample | Period is 20 ms |
| KV WorldState put + `ws.changed` | JetStream KV | < 1 ms | < 5 ms | 10 ms | Not on cmd path |
| Persist `RAL_CYCLES` | JetStream | async | p99 < 5 ms write | never block cmd | Audit, not control |
| Leaf → fleet hub | WAN | 20–200 ms | — | **never** cmd/estop | Cognition uplink only |
| LLM proposal | model | 100 ms–2 s | — | not a budget | Outside the spinal cord |

**Hard rules**

- Cmd and estop = **Core NATS**. If a write waits on disk, it is a bug.
- Cloud RTT is not in the motion budget. Tribunal runs onboard.
- 20 Hz twist coalesce is *intentional delay* (latest sample), not hop latency. Measure hop with coalesce disabled or on the sample that is sent.
- ROS action **result** (goal completed) is a different metric; this table is **goal accepted / topic published**.

### 10.2 Instrumentation

Stamp envelopes:

- `t_plan` — planner after `allow`
- `t_bridge_rx` — bridge `_on_cmd` entry (`robot_time` or monotonic)
- `t_ros_tx` — just before `publish_topic` / `send_action`

`hop_ms = t_ros_tx - t_plan`. Log p50/p99 per primitive every 10 s. Alert if estop p99 > 1 ms onboard.

### 10.3 Stub measurement (this package, Null I/O)

Not a substitute for a robot bench. Proves the Python dispatch is << budget.

```bash
python -m ral_ros_bridge.bench
```

In-process p99 budget for all stub paths: **200 µs**. Fail the bench if exceeded.

Measured on this package (2026-08-21, n=8000, Null I/O):

| Path | p50 | p99 | p999 | max |
|---|---|---|---|---|
| `focus_on` dispatch | 3.6 µs | 10.2 µs | 30 µs | 56 µs |
| `estop` dispatch | 3.6 µs | 10.1 µs | 27 µs | 48 µs |
| `twist_base` dispatch | 3.5 µs | 8.0 µs | 26 µs | 46 µs |
| stale `world_etag` drop | 2.6 µs | 5.5 µs | 21 µs | 30 µs |
| unknown primitive drop | 3.0 µs | 21.2 µs | 28 µs | 63 µs |

The stub is two orders of magnitude inside the 200 µs in-process budget and inside the 1–5 ms onboard skill-bus SLOs. Remaining latency on a real robot is NATS + ROS RMW + controller, not this mapping table.
