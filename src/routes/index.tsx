import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownToLine, Ban, Cable, Scale, Waypoints } from "lucide-react";
import { ACCOUNTS, CMD_MAP, LATENCY_SLO, STUB_BENCH, TEL_MAP } from "@/lib/bridge-mapping";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="mb-3 font-mono text-xs tracking-[0.18em] text-primary uppercase">
        Skill-bus contract
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
        RAL ROS Bridge
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
        ROS 2 is the robot. NATS is the mission. Core-4 is the law. The LLM
        cannot sign orders. This stub maps an allow-list of NATS primitives to
        ROS actions — nothing else gets through.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a
          href="/ral_ros_bridge.zip"
          download="ral_ros_bridge.zip"
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-fg hover:opacity-90"
        >
          <ArrowDownToLine className="size-4" strokeWidth={2} />
          Download bridge package
        </a>
        <a
          href="/ral_core.zip"
          download="ral_core.zip"
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-fg hover:bg-elevated"
        >
          Download Core-4 (Python)
        </a>
      </div>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2">
        <Role
          icon={<Waypoints className="size-4 text-primary" />}
          title="ROS 2"
          body="Muscles and senses: drivers, TF, ros2_control, Nav2/MoveIt. Never authorizes a skill."
        />
        <Role
          icon={<Cable className="size-4 text-primary" />}
          title="NATS"
          body="Nerves: skill subjects, KV world-state, leaf to fleet. No raw video, no 1 kHz effort."
        />
        <Role
          icon={<Scale className="size-4 text-primary" />}
          title="Core-4"
          body="Law: Kant/Locke/Spinoza/Hume as request-reply. Planner publishes cmd.* only after allow."
        />
        <Role
          icon={<Ban className="size-4 text-primary" />}
          title="PLC"
          body="Spinal cord: STO / e-stop. The bridge mirrors cmd.estop; it does not replace yellow iron."
        />
      </ul>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-fg">NATS → ROS (commands)</h2>
        <p className="mt-1 text-sm text-muted">
          Unknown primitive_type is dropped. Missing cycle_id is dropped. Stale
          world_etag is dropped.
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-elevated font-mono text-[11px] tracking-wide text-muted uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">Primitive</th>
                <th className="px-3 py-2 font-medium">NATS</th>
                <th className="px-3 py-2 font-medium">ROS</th>
                <th className="px-3 py-2 font-medium">Cap</th>
              </tr>
            </thead>
            <tbody>
              {CMD_MAP.map((row) => (
                <tr key={row.primitive} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-[13px] text-primary">{row.primitive}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-muted">{row.nats}</td>
                  <td className="px-3 py-2 text-[13px] text-fg">{row.ros}</td>
                  <td className="px-3 py-2 text-[12px] text-muted">{row.cap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-fg">ROS → NATS (telemetry)</h2>
        <p className="mt-1 text-sm text-muted">
          Images, clouds, and IMU stay in ROS. Only metadata crosses the bus.
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="bg-elevated font-mono text-[11px] tracking-wide text-muted uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">ROS</th>
                <th className="px-3 py-2 font-medium">NATS</th>
                <th className="px-3 py-2 font-medium">Cap</th>
              </tr>
            </thead>
            <tbody>
              {TEL_MAP.map((row) => (
                <tr key={row.ros} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-[12px] text-fg">{row.ros}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-muted">{row.nats}</td>
                  <td className="px-3 py-2 text-[12px] text-muted">{row.cap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-fg">Latency budgets (onboard)</h2>
        <p className="mt-1 text-sm text-muted">
          Skill-bus hop only. JetStream and the cloud stay off cmd/estop. PLC
          e-stop does not wait on this table. Stub dispatch is microseconds.
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-elevated font-mono text-[11px] tracking-wide text-muted uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">Path</th>
                <th className="px-3 py-2 font-medium">Hop</th>
                <th className="px-3 py-2 font-medium">p50</th>
                <th className="px-3 py-2 font-medium">p99</th>
                <th className="px-3 py-2 font-medium">Rule</th>
              </tr>
            </thead>
            <tbody>
              {LATENCY_SLO.map((row) => (
                <tr key={row.path} className="border-t border-border">
                  <td className="px-3 py-2 text-[13px] text-fg">{row.path}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-muted">{row.hop}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-fg">{row.p50}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-primary">{row.p99}</td>
                  <td className="px-3 py-2 text-[12px] text-muted">{row.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[20rem] text-left text-sm">
            <thead className="bg-elevated font-mono text-[11px] tracking-wide text-muted uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">Stub bench (Null I/O)</th>
                <th className="px-3 py-2 font-medium">p50</th>
                <th className="px-3 py-2 font-medium">p99</th>
              </tr>
            </thead>
            <tbody>
              {STUB_BENCH.map((row) => (
                <tr key={row.path} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-[12px] text-fg">{row.path}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-muted">{row.p50}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-muted">{row.p99}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-fg">nkey accounts</h2>
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {ACCOUNTS.map((a) => (
            <li key={a.name} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-sm text-primary">{a.name}</span>
                <span className="text-xs text-muted">{a.note}</span>
              </div>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
                pub {a.pub}
                <br />
                sub {a.sub}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 font-mono text-xs leading-relaxed text-muted">
        python -m ral_ros_bridge.demo
        <br />
        python -m ral_ros_bridge.bench
      </p>
    </main>
  );
}

function Role({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
      </div>
      <p className="text-[13px] leading-relaxed text-muted">{body}</p>
    </li>
  );
}
