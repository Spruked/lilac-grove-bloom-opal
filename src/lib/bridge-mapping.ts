export const CMD_MAP = [
  {
    primitive: "twist_base",
    nats: "cmd.motion.base",
    ros: "/cmd_vel Twist",
    cap: "20 Hz, latest-wins",
  },
  {
    primitive: "nav_to_pose",
    nats: "cmd.motion.base",
    ros: "Nav2 NavigateToPose",
    cap: "preempt previous",
  },
  {
    primitive: "focus_on",
    nats: "cmd.motion.head",
    ros: "head FollowJointTrajectory",
    cap: "IK already solved",
  },
  {
    primitive: "arm_follow",
    nats: "cmd.motion.arm",
    ros: "arm FollowJointTrajectory",
    cap: "preempt previous",
  },
  {
    primitive: "gripper_set",
    nats: "cmd.motion.gripper",
    ros: "GripperCommand",
    cap: "one in flight",
  },
  {
    primitive: "idle_in_region",
    nats: "cmd.motion.base",
    ros: "cancel Nav2 + zero twist",
    cap: "veto fallback",
  },
  {
    primitive: "estop",
    nats: "cmd.estop",
    ros: "Trigger /emergency_stop + cancel all",
    cap: "no coalesce; PLC still owns STO",
  },
] as const;

export const TEL_MAP = [
  { ros: "/joint_states", nats: "tel.motion.joints", cap: "≤ 50 Hz, no effort" },
  { ros: "TF base_link, ee_link", nats: "tel.motion.pose + KV", cap: "≤ 10 Hz" },
  { ros: "/detections", nats: "tel.perception.camera.meta", cap: "≤ 10 Hz" },
  { ros: "/diagnostics", nats: "tel.health", cap: "≤ 1 Hz" },
  { ros: "Nav2 status", nats: "tel.nav", cap: "events" },
] as const;

export const ACCOUNTS = [
  { name: "LLM", pub: "cycle.*.proposal", sub: "ws.changed, tel.health", note: "cannot cmd.*" },
  { name: "PLANNER", pub: "proposal, cmd.* after allow", sub: "verdict, tel.>", note: "only signer" },
  { name: "TRIBUNAL", pub: "verdict", sub: "proposal (req/reply)", note: "pure functions" },
  { name: "BRIDGE", pub: "tel.>, WS KV", sub: "cmd.motion.>, estop", note: "dumb I/O" },
  { name: "TOOLS", pub: "tel.tool", sub: "cmd.tool.*", note: "queue tool-workers" },
] as const;

export const LATENCY_SLO = [
  {
    path: "Core-4 evaluate()",
    hop: "in-process",
    p50: "< 0.2 ms",
    p99: "< 1 ms",
    rule: "Pure functions",
  },
  {
    path: "Tribunal req/reply",
    hop: "Core NATS RR",
    p50: "< 1 ms",
    p99: "< 2 ms",
    rule: "Onboard only",
  },
  {
    path: "cmd.estop fan-out",
    hop: "Core NATS",
    p50: "< 0.3 ms",
    p99: "< 1 ms",
    rule: "PLC still owns STO",
  },
  {
    path: "twist_base → /cmd_vel",
    hop: "NATS + topic",
    p50: "< 1 ms",
    p99: "< 5 ms",
    rule: "20 Hz coalesce separate",
  },
  {
    path: "arm/head goal accept",
    hop: "NATS + action",
    p50: "< 5 ms",
    p99: "< 15 ms",
    rule: "Not execution time",
  },
  {
    path: "Leaf → fleet",
    hop: "WAN",
    p50: "20–50 ms",
    p99: "200 ms",
    rule: "Never cmd/estop",
  },
] as const;

export const STUB_BENCH = [
  { path: "focus_on", p50: "3.6 µs", p99: "10.2 µs" },
  { path: "estop", p50: "3.6 µs", p99: "10.1 µs" },
  { path: "twist_base", p50: "3.5 µs", p99: "8.0 µs" },
  { path: "stale etag drop", p50: "2.6 µs", p99: "5.5 µs" },
  { path: "unknown drop", p50: "3.0 µs", p99: "21.2 µs" },
] as const;
