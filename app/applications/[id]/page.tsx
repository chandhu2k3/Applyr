import { Badge } from "@/components/ui/card";
import { ResolveBlock } from "@/components/applications/resolve-block";
import { getStore } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ApplicationDetail({ params }: { params: { id: string } }) {
  const app = await (await getStore()).getApplication(params.id);
  if (!app) notFound();
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">{app.company} — {app.title}</h1>
        <p className="font-mono text-[12px] text-neutral-500">{app.location} · {app.platform} · <a href={app.url} className="underline" target="_blank" rel="noreferrer">job link</a></p>
      </div>
      <div className="flex gap-2">
        <Badge tone={app.status === "SUBMITTED" || app.status === "VERIFIED" ? "verified" : app.status === "BLOCKED" ? "blocked" : "failed"}>{app.status}</Badge>
        {app.applicationId && <Badge tone="submitted">Ref: {app.applicationId}</Badge>}
        {app.resumeName && <Badge tone="ready">Resume: {app.resumeName}</Badge>}
      </div>
      {app.status === "BLOCKED" && <ResolveBlock applicationId={app.id} jobUrl={app.url} questions={app.missingQuestions ?? []} profileFields={app.missingProfile ?? []} />}
      <div className="panel">
        <div className="panel-header">Answers submitted ({Object.keys(app.answers).length})</div>
        <div className="p-4 font-mono text-[12px]">
          {Object.keys(app.answers).length === 0 ? <p className="text-neutral-400">None recorded.</p> :
            Object.entries(app.answers).map(([k, v]) => <div key={k} className="flex gap-3 border-b border-hairline py-1 last:border-0"><span className="w-48 shrink-0 text-neutral-500">{k}</span><span>{v}</span></div>)}
        </div>
      </div>
      <div className="panel">
        <div className="panel-header">Timeline ({app.events.length})</div>
        <div className="telemetry-log space-y-0.5 p-4">
          {app.events.length === 0 ? <p className="text-neutral-400">No events.</p> :
            app.events.map((e, i) => <div key={i} className="flex gap-3"><span className="metric-num shrink-0 text-neutral-400">{new Date(e.t).toLocaleTimeString()}</span><span className="w-32 shrink-0 font-medium text-cobalt">[{e.type}]</span><span>{JSON.stringify(e.meta ?? {})}</span></div>)}
        </div>
      </div>
    </div>
  );
}
