import { v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Ban, i as Cable, o as ArrowDownToLine, r as Scale, t as Waypoints } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-i0pXHXMY.js
var import_jsx_runtime = require_jsx_runtime();
var CMD_MAP = [
	{
		primitive: "twist_base",
		nats: "cmd.motion.base",
		ros: "/cmd_vel Twist",
		cap: "20 Hz, latest-wins"
	},
	{
		primitive: "nav_to_pose",
		nats: "cmd.motion.base",
		ros: "Nav2 NavigateToPose",
		cap: "preempt previous"
	},
	{
		primitive: "focus_on",
		nats: "cmd.motion.head",
		ros: "head FollowJointTrajectory",
		cap: "IK already solved"
	},
	{
		primitive: "arm_follow",
		nats: "cmd.motion.arm",
		ros: "arm FollowJointTrajectory",
		cap: "preempt previous"
	},
	{
		primitive: "gripper_set",
		nats: "cmd.motion.gripper",
		ros: "GripperCommand",
		cap: "one in flight"
	},
	{
		primitive: "idle_in_region",
		nats: "cmd.motion.base",
		ros: "cancel Nav2 + zero twist",
		cap: "veto fallback"
	},
	{
		primitive: "estop",
		nats: "cmd.estop",
		ros: "Trigger /emergency_stop + cancel all",
		cap: "no coalesce; PLC still owns STO"
	}
];
var TEL_MAP = [
	{
		ros: "/joint_states",
		nats: "tel.motion.joints",
		cap: "≤ 50 Hz, no effort"
	},
	{
		ros: "TF base_link, ee_link",
		nats: "tel.motion.pose + KV",
		cap: "≤ 10 Hz"
	},
	{
		ros: "/detections",
		nats: "tel.perception.camera.meta",
		cap: "≤ 10 Hz"
	},
	{
		ros: "/diagnostics",
		nats: "tel.health",
		cap: "≤ 1 Hz"
	},
	{
		ros: "Nav2 status",
		nats: "tel.nav",
		cap: "events"
	}
];
var ACCOUNTS = [
	{
		name: "LLM",
		pub: "cycle.*.proposal",
		sub: "ws.changed, tel.health",
		note: "cannot cmd.*"
	},
	{
		name: "PLANNER",
		pub: "proposal, cmd.* after allow",
		sub: "verdict, tel.>",
		note: "only signer"
	},
	{
		name: "TRIBUNAL",
		pub: "verdict",
		sub: "proposal (req/reply)",
		note: "pure functions"
	},
	{
		name: "BRIDGE",
		pub: "tel.>, WS KV",
		sub: "cmd.motion.>, estop",
		note: "dumb I/O"
	},
	{
		name: "TOOLS",
		pub: "tel.tool",
		sub: "cmd.tool.*",
		note: "queue tool-workers"
	}
];
var LATENCY_SLO = [
	{
		path: "Core-4 evaluate()",
		hop: "in-process",
		p50: "< 0.2 ms",
		p99: "< 1 ms",
		rule: "Pure functions"
	},
	{
		path: "Tribunal req/reply",
		hop: "Core NATS RR",
		p50: "< 1 ms",
		p99: "< 2 ms",
		rule: "Onboard only"
	},
	{
		path: "cmd.estop fan-out",
		hop: "Core NATS",
		p50: "< 0.3 ms",
		p99: "< 1 ms",
		rule: "PLC still owns STO"
	},
	{
		path: "twist_base → /cmd_vel",
		hop: "NATS + topic",
		p50: "< 1 ms",
		p99: "< 5 ms",
		rule: "20 Hz coalesce separate"
	},
	{
		path: "arm/head goal accept",
		hop: "NATS + action",
		p50: "< 5 ms",
		p99: "< 15 ms",
		rule: "Not execution time"
	},
	{
		path: "Leaf → fleet",
		hop: "WAN",
		p50: "20–50 ms",
		p99: "200 ms",
		rule: "Never cmd/estop"
	}
];
var STUB_BENCH = [
	{
		path: "focus_on",
		p50: "3.6 µs",
		p99: "10.2 µs"
	},
	{
		path: "estop",
		p50: "3.6 µs",
		p99: "10.1 µs"
	},
	{
		path: "twist_base",
		p50: "3.5 µs",
		p99: "8.0 µs"
	},
	{
		path: "stale etag drop",
		p50: "2.6 µs",
		p99: "5.5 µs"
	},
	{
		path: "unknown drop",
		p50: "3.0 µs",
		p99: "21.2 µs"
	}
];
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-3 font-mono text-xs tracking-[0.18em] text-primary uppercase",
				children: "Skill-bus contract"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-3xl font-semibold tracking-tight text-fg sm:text-4xl",
				children: "RAL ROS Bridge"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 max-w-2xl text-[15px] leading-relaxed text-muted",
				children: "ROS 2 is the robot. NATS is the mission. Core-4 is the law. The LLM cannot sign orders. This stub maps an allow-list of NATS primitives to ROS actions — nothing else gets through."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8 flex flex-col gap-3 sm:flex-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
					href: "/ral_ros_bridge.zip",
					download: "ral_ros_bridge.zip",
					className: "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-fg hover:opacity-90",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownToLine, {
						className: "size-4",
						strokeWidth: 2
					}), "Download bridge package"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "/ral_core.zip",
					download: "ral_core.zip",
					className: "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-fg hover:bg-elevated",
					children: "Download Core-4 (Python)"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-10 grid gap-3 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Role, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Waypoints, { className: "size-4 text-primary" }),
						title: "ROS 2",
						body: "Muscles and senses: drivers, TF, ros2_control, Nav2/MoveIt. Never authorizes a skill."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Role, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cable, { className: "size-4 text-primary" }),
						title: "NATS",
						body: "Nerves: skill subjects, KV world-state, leaf to fleet. No raw video, no 1 kHz effort."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Role, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scale, { className: "size-4 text-primary" }),
						title: "Core-4",
						body: "Law: Kant/Locke/Spinoza/Hume as request-reply. Planner publishes cmd.* only after allow."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Role, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ban, { className: "size-4 text-primary" }),
						title: "PLC",
						body: "Spinal cord: STO / e-stop. The bridge mirrors cmd.estop; it does not replace yellow iron."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-12",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-semibold text-fg",
						children: "NATS → ROS (commands)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Unknown primitive_type is dropped. Missing cycle_id is dropped. Stale world_etag is dropped."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 overflow-x-auto rounded-lg border border-border",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full min-w-[36rem] text-left text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "bg-elevated font-mono text-[11px] tracking-wide text-muted uppercase",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2 font-medium",
										children: "Primitive"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2 font-medium",
										children: "NATS"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2 font-medium",
										children: "ROS"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2 font-medium",
										children: "Cap"
									})
								] })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: CMD_MAP.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-t border-border",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 font-mono text-[13px] text-primary",
										children: row.primitive
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 font-mono text-[12px] text-muted",
										children: row.nats
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 text-[13px] text-fg",
										children: row.ros
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 text-[12px] text-muted",
										children: row.cap
									})
								]
							}, row.primitive)) })]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-semibold text-fg",
						children: "ROS → NATS (telemetry)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Images, clouds, and IMU stay in ROS. Only metadata crosses the bus."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 overflow-x-auto rounded-lg border border-border",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full min-w-[32rem] text-left text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "bg-elevated font-mono text-[11px] tracking-wide text-muted uppercase",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2 font-medium",
										children: "ROS"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2 font-medium",
										children: "NATS"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2 font-medium",
										children: "Cap"
									})
								] })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: TEL_MAP.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-t border-border",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 font-mono text-[12px] text-fg",
										children: row.ros
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 font-mono text-[12px] text-muted",
										children: row.nats
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 text-[12px] text-muted",
										children: row.cap
									})
								]
							}, row.ros)) })]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-semibold text-fg",
						children: "Latency budgets (onboard)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Skill-bus hop only. JetStream and the cloud stay off cmd/estop. PLC e-stop does not wait on this table. Stub dispatch is microseconds."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 overflow-x-auto rounded-lg border border-border",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full min-w-[36rem] text-left text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "bg-elevated font-mono text-[11px] tracking-wide text-muted uppercase",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2 font-medium",
										children: "Path"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2 font-medium",
										children: "Hop"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2 font-medium",
										children: "p50"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2 font-medium",
										children: "p99"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2 font-medium",
										children: "Rule"
									})
								] })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: LATENCY_SLO.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-t border-border",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 text-[13px] text-fg",
										children: row.path
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 font-mono text-[12px] text-muted",
										children: row.hop
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 font-mono text-[12px] text-fg",
										children: row.p50
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 font-mono text-[12px] text-primary",
										children: row.p99
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 text-[12px] text-muted",
										children: row.rule
									})
								]
							}, row.path)) })]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 overflow-x-auto rounded-lg border border-border",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full min-w-[20rem] text-left text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "bg-elevated font-mono text-[11px] tracking-wide text-muted uppercase",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2 font-medium",
										children: "Stub bench (Null I/O)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2 font-medium",
										children: "p50"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2 font-medium",
										children: "p99"
									})
								] })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: STUB_BENCH.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-t border-border",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 font-mono text-[12px] text-fg",
										children: row.path
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 font-mono text-[12px] text-muted",
										children: row.p50
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 font-mono text-[12px] text-muted",
										children: row.p99
									})
								]
							}, row.path)) })]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-10",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-semibold text-fg",
					children: "nkey accounts"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface",
					children: ACCOUNTS.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "px-4 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-baseline justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-sm text-primary",
								children: a.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs text-muted",
								children: a.note
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 font-mono text-[11px] leading-relaxed text-muted",
							children: [
								"pub ",
								a.pub,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
								"sub ",
								a.sub
							]
						})]
					}, a.name))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-10 font-mono text-xs leading-relaxed text-muted",
				children: [
					"python -m ral_ros_bridge.demo",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
					"python -m ral_ros_bridge.bench"
				]
			})
		]
	});
}
function Role({ icon, title, body }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "rounded-lg border border-border bg-surface p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-2 flex items-center gap-2",
			children: [icon, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-sm font-semibold text-fg",
				children: title
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[13px] leading-relaxed text-muted",
			children: body
		})]
	});
}
//#endregion
export { Home as component };
