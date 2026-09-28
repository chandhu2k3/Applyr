import { NextResponse } from "next/server";
import { analyzePage } from "@/agents/page-analyzer";
import { analyzeJob } from "@/agents/job-analyzer";
import { matchCandidate } from "@/agents/candidate-matcher";
import { selectResumeDeterministic } from "@/lib/resume/selector";
import { PolicySchema } from "@/lib/policy/engine";

// POST { url, title, bodyText, fields[], profile?, skills?, experienceYears?, resumes? }
// Runs: page → job → policy/match → resume. No browser writes, no submission.
export async function POST(req: Request) {
  try {
    const body = await req.json();
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
    return NextResponse.json({
      ok: match.decision === "APPLY" && resume !== null,
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
