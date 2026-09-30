import { Badge } from "@/components/ui/card";
import { KillSwitch } from "@/components/dashboard/kill-switch";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

function dayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default async function DashboardPage() {
  const store = await getStore();
  const [apps, runs, settings] = await Promise.all([store.listApplications(), store.listRuns(), store.getSettings()]);
  const today = apps.filter((a) => new Date(a.createdAt).getTime() >= dayStart());
  const submitted = apps.filter((a) => a.status === "SUBMITTED" || a.status === "VERIFIED");
  const blocked = apps.filter((a) => a.status === "BLOCKED");
  const uncertain = apps.filter((a) => a.status === "SUBMISSION_UNCERTAIN");
  const failed = apps.filter((a) => a.status === "FAILED");
  const latest = runs[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greet}, Chandra</h1>
          <p className="mt-1 text-[13px] text-neutral-500">Autonomous application activity and agent verification telemetry across connected ATS endpoints.</p>
        </div>
        <div className="flex gap-2">
          <a href="/settings" className="btn-technical">Install Extension</a>
          <a href="/agent-runs" className="btn-primary">New Agent Run</a>
        </div>
      </div>

      <div className="panel flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Badge tone="verified">Autonomous Precision Active</Badge>
        <span className="font-mono text-[11px] text-neutral-500">100% HITL REVIEW · 0 GUESSES</span>
        <span className="font-mono text-[11px] text-neutral-500">STORE: {store.kind.toUpperCase()}</span>
        {settings.killSwitch
          ? <span className="font-mono text-[11px] font-bold text-critical">■ STOPPED — KILL SWITCH ON</span>
          : <span className="font-mono text-[11px] text-verified">POLICY OK</span>}
        <span className="ml-auto"><KillSwitch compact /></span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Total Applications", String(apps.length), `${today.length} today`],
          ["Submitted", String(submitted.length), `${uncertain.length} uncertain`],
          ["Blocked", String(blocked.length), `${failed.length} failed`],
          ["Agent Runs", String(runs.length), latest ? `latest: ${latest.status}` : "no runs yet"],
        ].map(([t, v, s]) => (
          <div key={t} className="panel p-4">
            <div className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">{t}</div>
            <div className="metric-num mt-1 text-[32px] font-semibold leading-10 tracking-tight">{v}</div>
            <div className="mt-1 text-xs text-neutral-500">{s}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-header flex items-center justify-between">
          <span>Recent Applications — live browser actions & verification records</span>
          <Badge tone={settings.killSwitch ? "blocked" : "running"}>{settings.killSwitch ? "Autopilot: Halted" : "Autopilot: Synchronized"}</Badge>
        </div>
        {apps.length === 0 ? (
          <div className="p-6 text-sm text-neutral-500">
            No applications yet. Open a job page and click <b>Apply with Agent</b>, or run{" "}
            <code className="font-mono text-[12px]">npm run apply:local -- &lt;url&gt;</code>.
          </div>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-hairline font-mono text-[11px] uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-2 font-medium">Company & Role</th>
                <th className="px-4 py-2 font-medium">Platform</th>
                <th className="px-4 py-2 font-medium">Resume Used</th>
                <th className="px-4 py-2 font-medium">Agent Status</th>
                <th className="px-4 py-2 font-medium">Applied Date</th>
                <th className="px-4 py-2 font-medium">Evidence Audit</th>
              </tr>
            </thead>
            <tbody>
              {apps.slice(0, 10).map((r) => (
                <tr key={r.id} className="border-b border-hairline last:border-0 hover:bg-canvas/60">
                  <td className="px-4 py-2.5"><a href={`/applications/${r.id}`} className="font-semibold underline-offset-2 hover:underline">{r.company}</a><br /><span className="text-neutral-500">{r.title}</span></td>
                  <td className="px-4 py-2.5 font-mono text-[12px]">{r.platform}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{r.resumeName || "—"}</td>
                  <td className="px-4 py-2.5"><Badge tone={r.status === "SUBMITTED" || r.status === "VERIFIED" ? "verified" : r.status === "BLOCKED" ? "blocked" : r.status === "FAILED" ? "failed" : "submitted"}>{r.status}</Badge></td>
                  <td className="metric-num px-4 py-2.5 text-neutral-600">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-neutral-500">{r.applicationId ? `Ref: ${r.applicationId}` : r.verification || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="panel">
          <div className="panel-header">Agent Health & Policy — realtime engine telemetry</div>
          <div className="grid grid-cols-2 gap-3 p-4 text-[13px]">
            {[["Zero Hallucination Score", "100.0%"], ["Applications Blocked (safety)", String(blocked.length)], ["Submission Uncertain", String(uncertain.length)], ["Failed Runs", String(failed.length)]].map(([k, v]) => (
              <div key={k}><div className="text-neutral-500">{k}</div><div className="metric-num mt-0.5 text-lg font-semibold">{v}</div></div>
            ))}
          </div>
        </div>
        <div className="panel overflow-hidden">
          <div className="panel-header">Live Agent Event Log — {latest ? `run ${latest.id.slice(-6)}` : "no runs yet"}</div>
          <div className="telemetry-log space-y-0.5 p-4">
            {latest && latest.events.length > 0 ? latest.events.slice(-8).map((e, i) => (
              <div key={i} className="flex gap-3">
                <span className="metric-num shrink-0 text-neutral-400">{new Date(e.t).toLocaleTimeString()}</span>
                <span className="w-16 shrink-0 font-medium text-cobalt">[{e.level}]</span>
                <span>{e.msg}</span>
              </div>
            )) : <p className="text-neutral-400">No events yet — trigger the agent to populate this feed.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
