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

export type BlockedResult = {
  status: "BLOCKED" | "FAILED"; reason: string; answers: Record<string, string>; actions: string[];
  missingQuestions: string[]; missingProfile: string[];
};

export type AppAgentResult =
  | { status: "SUBMITTED" | "SUBMISSION_UNCERTAIN"; answers: Record<string, string>; evidence: string[]; applicationId: string | null; actions: string[] }
  | BlockedResult;

export async function runApplication(input: AppAgentInput, driver: FormDriver): Promise<AppAgentResult> {
  const actions: string[] = [];
  const answers: Record<string, string> = {};

  // Re-scan live page text for security halts (CAPTCHA may render after load).
  const halt = detectSecurityHalt(await driver.pageText());
  if (halt) return { status: "BLOCKED", reason: `${halt} — manual action required, agent paused`, answers, actions, missingQuestions: [], missingProfile: [] };

  // Analyze fields deterministically (semantic mapping already done by page analyzer upstream).
  const page = analyzePage({ url: input.url, title: input.title, bodyText: "", fields: input.pageFields });
  const required: Array<{ label: string; filled: boolean }> = [];
  const unknownRequired: string[] = [];
  const missingProfile: string[] = [];
  const handled = new Set<string>();
  let resumeUploaded = false;

  // Multi-step loop: fill each visible step, advance with Continue, stop at
  // Submit (or when stuck). Max 5 steps — never loop forever.
  for (let step = 0; step < 5; step++) {
    const live = step === 0
      ? page.fields
      : analyzePage({ url: input.url, title: input.title, bodyText: "", fields: await driver.snapshotFields() }).fields;
    for (const f of live) {
      const key = f.label || f.name;
      if (!key || handled.has(`${f.tag}:${key}`)) continue;
      handled.add(`${f.tag}:${key}`);
      if (f.semanticType === "resume") continue; // upload handled below
      await fillOne(f, key);
    }

    // Resume upload as soon as its field is visible (once).
    if (!resumeUploaded) {
      const resumefield = live.find((f) => f.semanticType === "resume");
      if (resumefield) {
        try {
          await driver.upload(resumefield.label || "Resume", input.resumePath, resumefield.name || undefined);
          resumeUploaded = true;
          actions.push("resume-uploaded");
        } catch (e) {
          return { status: "BLOCKED", reason: `Resume upload failed: ${e instanceof Error ? e.message : e}`, answers, actions, missingQuestions: unknownRequired, missingProfile };
        }
      }
    }

    const pendingUnknown = unknownRequired.length > 0;
    const hasSubmit = await driver.hasSubmitButton().catch(() => true);
    if (!pendingUnknown && hasSubmit) break; // ready for validation + submit
    if (await driver.clickContinue().catch(() => false)) {
      actions.push(`step-${step + 1}-advanced`);
      continue;
    }
    break; // no continue control: submit phase (gate decides) or stuck
  }

  async function fillOne(f: { tag: string; type: string; label: string; name: string; required: boolean; semanticType: string | null }, key: string): Promise<void> {
    if (f.semanticType) {
      const v = answerFromProfile(f.semanticType, input.profile);
      if (v.kind === "ANSWERED") {
        if (f.tag === "select") await driver.select(f.label, v.answer, f.name);
        else if (f.type === "checkbox") await driver.setChecked(f.label, /yes|true|agree/i.test(v.answer), f.name);
        else await driver.fillText(f.label, v.answer, f.name);
        answers[key] = v.answer;
        actions.push(`filled:${key}`);
        if (f.required) required.push({ label: key, filled: true });
        return;
      }
    }
    // Custom question → approved bank only.
    const bankHit = matchAnswer(key, input.bank);
    if (bankHit.kind === "ANSWERED") {
      await driver.fillText(f.label, bankHit.answer, f.name);
      answers[key] = bankHit.answer;
      actions.push(`bank:${key}`);
      if (f.required) required.push({ label: key, filled: true });
      return;
    }
    if (f.required) {
      unknownRequired.push(key);
      required.push({ label: key, filled: false });
      // Known field but no trusted value → profile gap (user fills profile once).
      // Unknown field → one-off question (user answers, optionally saves to bank).
      if (f.semanticType && f.semanticType !== "resume" && !missingProfile.includes(f.semanticType)) {
        missingProfile.push(f.semanticType);
      }
    }
  }

  // Fallback: snapshot may miss lazily-rendered upload widgets — one blind
  // attempt by conventional label before giving up (old behavior preserved).
  if (!resumeUploaded) {
    try {
      await driver.upload("Resume", input.resumePath, undefined);
      resumeUploaded = true;
      actions.push("resume-uploaded-fallback");
    } catch (e) {
      return { status: "BLOCKED", reason: `Resume upload failed: ${e instanceof Error ? e.message : e}`, answers, actions, missingQuestions: unknownRequired, missingProfile };
    }
  }

  const gate = runValidationGate({
    company: input.company, title: input.title, resumeId: input.resumePath, resumeUploaded,
    requiredFields: required, unknownRequired, fabricated: false,
    policyDecision: input.policyDecision, duplicate: input.duplicate, visibleErrors: [],
  });
  if (!gate.ok) return { status: "BLOCKED", reason: `Validation gate: ${gate.failures.join("; ")}`, answers, actions, missingQuestions: unknownRequired, missingProfile };

  const urlBefore = driver.url();
  try {
    await driver.clickSubmit();
  } catch (e) {
    return { status: "FAILED", reason: `Submit failed: ${e instanceof Error ? e.message : e}`, answers, actions, missingQuestions: [], missingProfile: [] };
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
