import { analyzePage } from "./page-analyzer";
import { matchAnswer, answerFromProfile, type AnswerEntry } from "./answer-matcher";
import { runValidationGate } from "@/lib/validation/gate";
import { verifySubmission } from "./verification-agent";
import { detectSecurityHalt, pickAdapter, type FormDriver } from "@/browser/adapters/types";

// ApplicationAgent — fills ONLY from trusted sources, validates, submits, verifies.
// Driver-injected: real BrowserExecutor in production, FakeDriver in unit tests.

export type AppAgentInput = {
  url: string;
  company: string;
  title: string;
  pageFields: Array<{ tag: string; type: string; label: string; name: string; required: boolean }>;
  profile: Record<string, string>;
  bank: AnswerEntry[];
  resumePath: string;
  policyDecision: "APPLY" | "SKIP" | "BLOCK";
  duplicate: boolean;
};

export type AppAgentResult =
  | { status: "SUBMITTED" | "SUBMISSION_UNCERTAIN"; answers: Record<string, string>; evidence: string[]; applicationId: string | null; actions: string[] }
  | { status: "BLOCKED" | "FAILED"; reason: string; answers: Record<string, string>; actions: string[] };

export async function runApplication(input: AppAgentInput, driver: FormDriver): Promise<AppAgentResult> {
  const actions: string[] = [];
  const answers: Record<string, string> = {};

  // Re-scan live page text for security halts (CAPTCHA may render after load).
  const halt = detectSecurityHalt(await driver.pageText());
  if (halt) return { status: "BLOCKED", reason: `${halt} — manual action required, agent paused`, answers, actions };

  // Analyze fields deterministically (semantic mapping already done by page analyzer upstream).
  const page = analyzePage({ url: input.url, title: input.title, bodyText: "", fields: input.pageFields });
  const required: Array<{ label: string; filled: boolean }> = [];
  const unknownRequired: string[] = [];

  for (const f of page.fields) {
    const key = f.label || f.name;
    if (f.semanticType === "resume") continue; // handled as upload below
    if (f.semanticType) {
      const v = answerFromProfile(f.semanticType, input.profile);
      if (v.kind === "ANSWERED") {
        if (f.tag === "select") await driver.select(f.label, v.answer, f.name);
        else if (f.type === "checkbox") await driver.setChecked(f.label, /yes|true|agree/i.test(v.answer), f.name);
        else await driver.fillText(f.label, v.answer, f.name);
        answers[key] = v.answer;
        actions.push(`filled:${key}`);
        if (f.required) required.push({ label: key, filled: true });
        continue;
      }
    }
    // Custom question → approved bank only.
    const bankHit = matchAnswer(key, input.bank);
    if (bankHit.kind === "ANSWERED") {
      await driver.fillText(f.label, bankHit.answer, f.name);
      answers[key] = bankHit.answer;
      actions.push(`bank:${key}`);
      if (f.required) required.push({ label: key, filled: true });
      continue;
    }
    if (f.required) {
      unknownRequired.push(key);
      required.push({ label: key, filled: false });
    }
  }

  // Resume upload (must succeed).
  let resumeUploaded = false;
  try {
    const resumefield = page.fields.find((f) => f.semanticType === "resume") ?? { label: "Resume", name: "" };
    await driver.upload(resumefield.label || "Resume", input.resumePath, resumefield.name || undefined);
    resumeUploaded = true;
    actions.push("resume-uploaded");
  } catch (e) {
    return { status: "BLOCKED", reason: `Resume upload failed: ${e instanceof Error ? e.message : e}`, answers, actions };
  }

  const gate = runValidationGate({
    company: input.company, title: input.title, resumeId: input.resumePath, resumeUploaded,
    requiredFields: required, unknownRequired, fabricated: false,
    policyDecision: input.policyDecision, duplicate: input.duplicate, visibleErrors: [],
  });
  if (!gate.ok) return { status: "BLOCKED", reason: `Validation gate: ${gate.failures.join("; ")}`, answers, actions };

  const urlBefore = driver.url();
  try {
    await driver.clickSubmit();
  } catch (e) {
    return { status: "FAILED", reason: `Submit failed: ${e instanceof Error ? e.message : e}`, answers, actions };
  }
  const after = await driver.pageText();
  const adapter = pickAdapter(input.url);
  void adapter;
  const verdict = verifySubmission(after, urlBefore, driver.url());
  if (verdict.verified) {
    return { status: "SUBMITTED", answers, evidence: verdict.evidence, applicationId: verdict.applicationId, actions };
  }
  return { status: "SUBMISSION_UNCERTAIN", answers, evidence: verdict.evidence, applicationId: verdict.applicationId, actions };
}
