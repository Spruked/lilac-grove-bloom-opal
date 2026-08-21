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
