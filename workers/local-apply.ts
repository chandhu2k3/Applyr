// Local apply runner: `npm run apply:local -- <url> [--headed]`
// Drives the REAL application agent against a URL on this machine.
// Usage example (mock): npm run apply:local -- http://localhost:3000/mock-ats/simple
import { BrowserExecutor } from "../browser/executor";
import { analyzePage } from "../agents/page-analyzer";
import { analyzeJob } from "../agents/job-analyzer";
import { matchCandidate } from "../agents/candidate-matcher";
import { runApplication } from "../agents/application-agent";
import { PolicySchema } from "../lib/policy/engine";
import { selectResumeDeterministic } from "../lib/resume/selector";

const url = process.argv[2];
if (!url) {
  console.error("usage: npm run apply:local -- <url> [--headed]");
  process.exit(1);
}
const headed = process.argv.includes("--headed");

const PROFILE: Record<string, string> = {
  firstName: process.env.APPLY_FIRST ?? "Test",
  lastName: process.env.APPLY_LAST ?? "Candidate",
  email: process.env.APPLY_EMAIL ?? "test@example.com",
  phone: process.env.APPLY_PHONE ?? "9999999999",
  linkedin: "https://linkedin.com/in/test",
};

async function main(): Promise<void> {
  const ex = new BrowserExecutor();
  try {
    await ex.launch(!headed);
    await ex.navigate(url);
    const snapshot = await ex.snapshotFields();
    const page = analyzePage({ url, title: await ex.pageTitle(), bodyText: await ex.pageText(), fields: snapshot });
    if (page.securityBlock) {
      console.log(JSON.stringify({ status: "BLOCKED", reason: page.securityBlock }));
      return;
    }
    const job = analyzeJob({ title: url, description: await ex.pageText(), url, platform: page.platform });
    const policy = PolicySchema.parse({});
    const match = matchCandidate({ job, candidateSkills: [], candidateExperienceYears: 1 }, policy, true);
    if (match.decision !== "APPLY") {
      console.log(JSON.stringify({ status: "BLOCKED", decision: match.decision, reasons: match.reasons }));
      return;
    }
    const resume = selectResumeDeterministic({ title: job.title, description: job.description }, []);
    const result = await runApplication(
      {
        url, company: job.company, title: job.title,
        pageFields: snapshot.map((f) => ({ ...f })),
        profile: PROFILE, bank: [], resumePath: process.env.APPLY_RESUME ?? "tests/fixtures/resume.pdf",
        policyDecision: "APPLY", duplicate: false,
      },
      ex
    );
    console.log(JSON.stringify({ ...result, job: { title: job.title, family: job.roleFamily }, resume }, null, 2));
  } finally {
    await ex.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
