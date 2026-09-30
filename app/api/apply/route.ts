import { NextResponse } from "next/server";
import { runApplyPipeline } from "@/lib/apply/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST { url, headed?, dryRun? } → starts the pipeline WITHOUT awaiting the
// browser work (local dev server stays alive; Vercel can't run Playwright).
// Returns { runId } immediately; poll GET /api/runs for the verdict.
export async function POST(req: Request) {
  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Browser apply runs on your local dashboard only (npm run dev). Vercel can't drive Playwright." }, { status: 501 });
  }
  const body = await req.json().catch(() => ({}));
  const url = String(body.url ?? "");
  if (!url.startsWith("http")) {
    return NextResponse.json({ error: "url (http…) required" }, { status: 400 });
  }
  const { getStore } = await import("@/lib/db");
  const store = await getStore();
  const run = await store.createRun({ status: "running", stage: "queued", jobTitle: url, applicationId: null, aiCalls: 0 });

  runApplyPipeline({ url, headed: Boolean(body.headed), dryRun: Boolean(body.dryRun), runId: run.id })
    .catch(async (e) => {
      await store.addRunEvent(run.id, { t: new Date().toISOString(), level: "FAILED", msg: e instanceof Error ? e.message : String(e) }).catch(() => {});
      await store.finishRun(run.id, "failed", "pipeline").catch(() => {});
    });

  return NextResponse.json({ runId: run.id, status: "started" }, { status: 202 });
}
