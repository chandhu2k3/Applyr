import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ runs: await (await getStore()).listRuns() });
}

export async function DELETE() {
  await (await getStore()).clearHistory();
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const b = await req.json();
  const store = await getStore();
  // { event, runId } → append; otherwise create run.
  if (b.runId && b.event) {
    await store.addRunEvent(String(b.runId), { t: new Date().toISOString(), level: String(b.event), msg: String(b.msg ?? b.event) });
    if (b.finish) await store.finishRun(String(b.runId), String(b.status ?? "done"), String(b.stage ?? ""));
    return NextResponse.json({ ok: true });
  }
  const run = await store.createRun({
    status: String(b.status ?? "running"), stage: String(b.stage ?? ""),
    jobTitle: String(b.jobTitle ?? ""), applicationId: b.applicationId ? String(b.applicationId) : null, aiCalls: 0,
  });
  return NextResponse.json({ run }, { status: 201 });
}
