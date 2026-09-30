import { NextResponse } from "next/server";
import { analyzePage } from "@/agents/page-analyzer";
import { analyzeJob } from "@/agents/job-analyzer";
import { matchCandidate } from "@/agents/candidate-matcher";
import { selectResumeDeterministic } from "@/lib/resume/selector";
import { PolicySchema } from "@/lib/policy/engine";
import { getStore } from "@/lib/db";
import { now } from "@/lib/db/types";

// POST { url, title, bodyText, fields[], profile?, skills?, experienceYears?, resumes? }
// Runs: kill-switch → page → job → policy/match → resume. No browser writes, no submission.
// Every call is recorded as an agent run.
export async function POST(req: Request) {
  const store = await getStore();
  const run = await store.createRun({ status: "running", stage: "analyzePage", jobTitle: "", applicationId: null, aiCalls: 0 }).catch(() => null);
  const log = (level: string, msg: string) => {
    if (run) store.addRunEvent(run.id, { t: now(), level, msg }).catch(() => {});
  };
  try {
    const body = await req.json();
    if ((await store.getSettings()).killSwitch) {
      log("BLOCKED", "Kill switch active — analysis refused");
      if (run) await store.finishRun(run.id, "blocked", "killSwitch").catch(() => {});
      return NextResponse.json({ ok: false, stage: "killSwitch", decision: "BLOCK", reason: "STOP ALL APPLICATIONS is active" });
    }
    const page = analyzePage(body);
    if (!page.isJobPage) {
      return NextResponse.json({ ok: false, stage: "analyzePage", reason: "Not a job/application page", page });
    }
    if (page.securityBlock) {
      return NextResponse.json({ ok: false, stage: "security", blocked: page.securityBlock, reason: "Manual action required — agent paused", page });
    }
    const job = analyzeJob({ title: body.title ?? "", description: body.bodyText ?? "", url: body.url ?? "", platform: page.platform });
    const policy = PolicySchema.parse(body.policy ?? {});
    const match = matchCandidate(
      { job, candidateSkills: body.skills ?? [], candidateExperienceYears: body.experienceYears ?? 0 },
      policy,
      (body.resumes ?? []).some((r: { active: boolean }) => r.active)
    );
    const resume =
      match.decision === "APPLY"
        ? selectResumeDeterministic({ title: job.title, description: job.description }, body.resumes ?? [])
        : null;
    const ok = match.decision === "APPLY" && resume !== null;
    log(ok ? "MATCH" : "BLOCKED", `${job.title} → ${match.decision}${resume ? ` · ${resume.resumeId}` : ""}`);
    if (run) await store.finishRun(run.id, ok ? "done" : "blocked", "analyze").catch(() => {});
    return NextResponse.json({
      ok,
      decision: match.decision,
      page: { platform: page.platform, fields: page.fields.length, unmappedRequired: page.unmappedRequired },
      job,
      match: { confidence: match.confidence, reasons: match.reasons },
      resume,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: e instanceof Error ? e.message : "analyze failed" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/analyze", version: "v0.2.0-phase2" });
}
