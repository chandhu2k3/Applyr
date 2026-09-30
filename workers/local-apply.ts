// Local apply runner: `npm run apply:local -- <url> [--headed]`
// Drives the REAL application agent on this machine and RECORDS everything
// (run + application land in the store, so the dashboard shows real data).
// Usage: npm run apply:local -- http://localhost:3000/mock-ats/simple
import { BrowserExecutor } from "../browser/executor";
import { analyzePage } from "../agents/page-analyzer";
import { analyzeJob } from "../agents/job-analyzer";
import { matchCandidate } from "../agents/candidate-matcher";
import { runApplication } from "../agents/application-agent";
import { PolicySchema } from "../lib/policy/engine";
import { selectResumeDeterministic } from "../lib/resume/selector";
import { getStore } from "../lib/db";
import { now } from "../lib/db/types";

const url = process.argv[2];
if (!url) {
  console.error("usage: npm run apply:local -- <url> [--headed]");
  process.exit(1);
}
const headed = process.argv.includes("--headed");

async function main(): Promise<void> {
  const store = getStore();
  if ((await store.getSettings()).killSwitch) {
    console.log(JSON.stringify({ status: "BLOCKED", reason: "Kill switch active" }));
    return;
  }
  const profile = await store.getProfile();
  const bank = (await store.listAnswers()).map((a) => ({ pattern: a.pattern, answer: a.answer, category: a.category as "FACTUAL", approved: a.approved }));
  const storedResumes = (await store.listResumes()).filter((r) => r.active).map((r) => ({ id: r.id, roleFamily: r.roleFamily, active: r.active, isDefault: r.isDefault, keywords: r.keywords }));
  const policy = PolicySchema.parse(await store.getPolicy());

  const run = await store.createRun({ status: "running", stage: "launch", jobTitle: url, applicationId: null, aiCalls: 0 });
  const log = (level: string, msg: string) => store.addRunEvent(run.id, { t: now(), level, msg }).catch(() => {});
  const ex = new BrowserExecutor();
  try {
    await ex.launch(!headed);
    await log("AGENT", `Navigated ${url}`);
    await ex.navigate(url);
    const snapshot = await ex.snapshotFields();
    const page = analyzePage({ url, title: await ex.pageTitle(), bodyText: await ex.pageText(), fields: snapshot });
    await log("PAGE", `Platform ${page.platform}, ${snapshot.length} fields`);
    if (page.securityBlock) {
      await log("BLOCKED", page.securityBlock);
      await store.finishRun(run.id, "blocked", "security");
      console.log(JSON.stringify({ status: "BLOCKED", reason: page.securityBlock }));
      return;
    }
    const text = await ex.pageText();
    const job = analyzeJob({ title: await ex.pageTitle(), description: text, url, platform: page.platform });
    const match = matchCandidate({ job, candidateSkills: [], candidateExperienceYears: 1 }, policy, storedResumes.length > 0);
    await log("MATCH", `${job.title} [${job.roleFamily}] → ${match.decision}`);
    if (match.decision !== "APPLY") {
      await store.finishRun(run.id, "blocked", "policy");
      console.log(JSON.stringify({ status: "BLOCKED", decision: match.decision, reasons: match.reasons }));
      return;
    }
    const resume = selectResumeDeterministic({ title: job.title, description: job.description }, storedResumes);
    if (!resume) {
      await store.finishRun(run.id, "blocked", "resume");
      console.log(JSON.stringify({ status: "BLOCKED", reason: "No active resume for family" }));
      return;
    }
    await log("RESUME", `Selected ${resume.resumeId}`);
    const result = await runApplication(
      {
        url, company: job.company || new URL(url).hostname, title: job.title,
        pageFields: snapshot.map((f) => ({ ...f })),
        profile, bank, resumePath: process.env.APPLY_RESUME ?? "tests/fixtures/resume.pdf",
        policyDecision: "APPLY", duplicate: false,
      },
      ex
    );
    const app = await store.createApplication({
      company: job.company || new URL(url).hostname, title: job.title, location: job.location,
      url, platform: page.platform, resumeId: resume.resumeId, resumeName: resume.resumeId,
      status: result.status === "SUBMITTED" ? "SUBMITTED" : result.status,
      verification: result.status === "SUBMITTED" ? (result.evidence?.join("; ") ?? "") : ("reason" in result ? result.reason : ""),
      applicationId: result.status === "SUBMITTED" ? result.applicationId : null,
      answers: result.answers,
    });
    await store.addAppEvent(app.id, { t: now(), type: "AGENT_RUN", meta: { runId: run.id } });
    await log(result.status === "SUBMITTED" ? "VERIFY" : "BLOCKED", JSON.stringify(result).slice(0, 500));
    await store.finishRun(run.id, result.status === "SUBMITTED" ? "done" : "blocked", "apply");
    console.log(JSON.stringify({ ...result, applicationId: app.id }, null, 2));
  } finally {
    await ex.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
