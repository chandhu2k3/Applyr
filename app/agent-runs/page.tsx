import { Badge } from "@/components/ui/card";
import { ApplyForm, ClearHistory } from "@/components/runs/apply-form";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await (await getStore()).listRuns();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Agent runs — observability ({runs.length})</h1>
        <ClearHistory />
      </div>
      <ApplyForm />
      {runs.length === 0 && <p className="text-sm text-neutral-500">No runs yet. Paste a job URL above, use the extension, or run <code className="font-mono text-[12px]">npm run apply:local</code>.</p>}
      {runs.map((r) => (
        <div key={r.id} className="panel">
          <div className="panel-header flex items-center justify-between">
            <span className="font-mono normal-case tracking-normal">{r.id.slice(-8)} · {r.jobTitle || "analysis"} · {new Date(r.createdAt).toLocaleString()}</span>
            <Badge tone={r.status === "done" ? "verified" : r.status === "blocked" ? "blocked" : "running"}>{r.status} · {r.stage}</Badge>
          </div>
          <div className="telemetry-log space-y-0.5 p-4">
            {r.events.length === 0 ? <p className="text-neutral-400">No events.</p> :
              r.events.map((e, i) => <div key={i} className="flex gap-3"><span className="metric-num shrink-0 text-neutral-400">{new Date(e.t).toLocaleTimeString()}</span><span className="w-16 shrink-0 font-medium text-cobalt">[{e.level}]</span><span>{e.msg}</span></div>)}
          </div>
        </div>
      ))}
    </div>
  );
}
