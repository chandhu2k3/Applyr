import { BrowserExecutor } from "@/browser/executor";
import { analyzePage } from "@/agents/page-analyzer";
import { analyzeJob, extractCompany } from "@/agents/job-analyzer";
import { matchCandidate } from "@/agents/candidate-matcher";
import { runApplication } from "@/agents/application-agent";
import { PolicySchema } from "@/lib/policy/engine";
import { selectResumeDeterministic } from "@/lib/resume/selector";
import { isDuplicate } from "@/lib/validation/gate";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/db";
import { now } from "@/lib/db/types";

// Single shared pipeline: dashboard route, extension (via route) and CLI all
// execute exactly this. Every outcome — including BLOCKED — is recorded.

export type PipelineResult = {
  status: string;
  runId: string;
  applicationId: string | null;
  detail: Record<string, unknown>;
};

async function recordBlocked(store: Awaited<ReturnType<typeof getStore>>, runId: string, stage: string, reason: string, job: { company: string; title: string; location: string; url: string; platform: string }, missingQuestions: string[] = []): Promise<PipelineResult> {
  await store.addRunEvent(runId, { t: now(), level: "BLOCKED", msg: reason }).catch(() => {});
  await store.finishRun(runId, "blocked", stage).catch(() => {});
  const app = await store.createApplication({
    company: job.company, title: job.title, location: job.location, url: job.url, platform: job.platform,
    resumeId: "", resumeName: "", status: "BLOCKED", verification: reason,
    applicationId: null, answers: {}, missingQuestions, missingProfile: [],
  });
  return { status: "BLOCKED", runId, applicationId: app.id, detail: { reason, missingQuestions } };
}

export async function runApplyPipeline(opts: { url: string; headed?: boolean; dryRun?: boolean; resumePath?: string; runId?: string }): Promise<PipelineResult> {
  const { url, headed = false, dryRun = false } = opts;
  const store = await getStore();

  const run = opts.runId
    ? { id: opts.runId }
    : await store.createRun({ status: "running", stage: "launch", jobTitle: url, applicationId: null, aiCalls: 0 });
  const runId = run.id;

  if ((await store.getSettings()).killSwitch) {
    const run = runId
      ? { id: runId }
      : await store.createRun({ status: "running", stage: "killSwitch", jobTitle: url, applicationId: null, aiCalls: 0 });
    return recordBlocked(store, run.id, "killSwitch", "Kill switch active", { company: "", title: url, location: "", url, platform: "generic" });
  }

  const profile = await store.getProfile();
  const bank = (await store.listAnswers()).map((a) => ({ pattern: a.pattern, answer: a.answer, category: a.category as "FACTUAL", approved: a.approved }));
  const storedResumes = (await store.listResumes()).filter((r) => r.active).map((r) => ({ id: r.id, name: r.name, roleFamily: r.roleFamily, active: r.active, isDefault: r.isDefault, keywords: r.keywords }));
  const policy = PolicySchema.parse(await store.getPolicy());

  const log = (level: string, msg: string) => store.addRunEvent(runId, { t: now(), level, msg }).catch(() => {});
  const ex = new BrowserExecutor();
  try {
    await ex.launch(!headed);
    await log("AGENT", `Navigated ${url}`);
    await ex.navigate(url);
    const snapshot = await ex.snapshotFields();
    const pageTitle = await ex.pageTitle();
    const text = await ex.pageText();
    const page = analyzePage({ url, title: pageTitle, bodyText: text, fields: snapshot });
    await log("PAGE", `Platform ${page.platform}, ${snapshot.length} fields`);
    if (page.securityBlock) {
      return recordBlocked(store, run.id, "security", `${page.securityBlock} — manual action required`, { company: "", title: pageTitle, location: "", url, platform: page.platform });
    }

    const job = analyzeJob({ title: pageTitle, description: text, url, platform: page.platform });
    job.company = extractCompany(url, pageTitle, text);
    const skills = (profile.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const expYears = Number(profile.experienceYears ?? 1) || 0;

    // Duplicate prevention: only a CONFIRMED submission blocks a retry.
    // Blocked/failed/uncertain records stay retryable (resolve → retry loop).
    const existing = await store.listApplications();
    const confirmed = existing.filter((a) => a.status === "SUBMITTED" || a.status === "VERIFIED");
    if (isDuplicate({ url, company: job.company, title: job.title, location: job.location }, confirmed.map((a) => ({ url: a.url, company: a.company, title: a.title, location: a.location })))) {
      const dup = confirmed.find((a) => a.url === url);
      await log("BLOCKED", "Duplicate application");
      await store.finishRun(runId, "blocked", "duplicate").catch(() => {});
      return { status: "DUPLICATE", runId, applicationId: dup?.id ?? null, detail: { reason: "Already applied — see existing record" } };
    }

    // Rate limiting from today's recorded applications.
    const attempts = existing.map((a) => ({ at: new Date(a.createdAt).getTime(), company: a.company }));
    const rate = checkRateLimit(attempts, Date.now(), job.company || "unknown", {
      maxPerDay: (policy.maxPerDay as number) ?? 25,
      maxPerHour: (policy.maxPerHour as number) ?? 5,
      maxPerCompanyPerDay: (policy.maxPerCompanyPerDay as number) ?? 2,
      minDelaySecs: 30,
    });
    if (!rate.allowed) {
      return recordBlocked(store, run.id, "rateLimit", rate.reason ?? "Rate limited", { company: job.company, title: job.title, location: job.location, url, platform: page.platform });
    }

    const match = matchCandidate({ job, candidateSkills: skills, candidateExperienceYears: expYears }, policy, storedResumes.length > 0);
    await log("MATCH", `${job.title} @ ${job.company} [${job.roleFamily}] → ${match.decision}`);
    if (match.decision !== "APPLY") {
      return recordBlocked(store, run.id, "policy", match.reasons.join("; "), { company: job.company, title: job.title, location: job.location, url, platform: page.platform });
    }

    const resume = selectResumeDeterministic({ title: job.title, description: job.description }, storedResumes);
    if (!resume) {
      return recordBlocked(store, run.id, "resume", "No active resume for this role family", { company: job.company, title: job.title, location: job.location, url, platform: page.platform });
    }
    await log("RESUME", `Selected ${resume.resumeId}`);

    if (dryRun) {
      await store.finishRun(run.id, "done", "dry-run").catch(() => {});
      return {
        status: "DRY_RUN", runId: run.id, applicationId: null,
        detail: {
          decision: "APPLY",
          job: { title: job.title, company: job.company, family: job.roleFamily, confidence: job.confidence },
          match: { confidence: match.confidence, reasons: match.reasons }, resume,
          requiredFields: snapshot.filter((f) => f.required).map((f) => f.label || f.name),
        },
      };
    }

    let result: Awaited<ReturnType<typeof runApplication>>;
    try {
      result = await runApplication(
        {
          url, company: job.company, title: job.title,
          pageFields: snapshot.map((f) => ({ ...f })),
          profile, bank, resumePath: opts.resumePath ?? process.env.APPLY_RESUME ?? "tests/fixtures/resume.pdf",
          policyDecision: "APPLY", duplicate: false,
        },
        ex
      );
    } catch (e) {
      // A fill/upload/click crash must still leave a tracked record, never a bare run.
      const reason = `Agent error: ${e instanceof Error ? e.message : String(e).slice(0, 300)}`;
      await log("FAILED", reason);
      await store.finishRun(runId, "failed", "apply").catch(() => {});
      const app = await store.createApplication({
    company: job.company, title: job.title, location: job.location, url, platform: page.platform,
        resumeId: resume.resumeId, resumeName: storedResumes.find((r) => r.id === resume.resumeId)?.name ?? resume.resumeId,
        status: "FAILED", verification: reason, applicationId: null, answers: {}, missingQuestions: [], missingProfile: [],
      });
      return { status: "FAILED", runId, applicationId: app.id, detail: { reason } };
    }
    const status = result.status === "SUBMITTED" ? "SUBMITTED" : result.status;
    const evidence = "evidence" in result ? result.evidence?.join("; ") ?? "" : "";
    const extAppId = "applicationId" in result ? result.applicationId : null;
    const app = await store.createApplication({
    company: job.company, title: job.title, location: job.location, url, platform: page.platform,
      resumeId: resume.resumeId, resumeName: storedResumes.find((r) => r.id === resume.resumeId)?.name ?? resume.resumeId,
      status,
      verification: status === "SUBMITTED" ? evidence : ("reason" in result ? result.reason : ""),
      applicationId: status === "SUBMITTED" ? extAppId : null,
      answers: result.answers,
      missingQuestions: "missingQuestions" in result ? result.missingQuestions : [],
      missingProfile: "missingProfile" in result ? result.missingProfile : [],
    });
    await store.addAppEvent(app.id, { t: now(), type: "AGENT_RUN", meta: { runId } });
    // Supersede older non-terminal attempts for the same URL.
    for (const old of existing.filter((a) => a.url === url && a.id !== app.id && !["SUBMITTED", "VERIFIED", "SUPERSEDED"].includes(a.status))) {
      await store.setAppStatus(old.id, "SUPERSEDED", `Superseded by ${app.id.slice(-6)}`).catch(() => {});
    }
    await log(status === "SUBMITTED" ? "VERIFY" : "BLOCKED", JSON.stringify(result).slice(0, 500));
    await store.finishRun(runId, status === "SUBMITTED" ? "done" : "blocked", "apply").catch(() => {});
    return { status, runId, applicationId: app.id, detail: { ...result } };
  } finally {
    await ex.close();
  }
}
