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
