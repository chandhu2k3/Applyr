// §44 central orchestrator — every stage returns success/failure/block, never silent.
import { assertTransition, type ApplicationStatus } from "@/lib/state-machine";

export type StageResult = { ok: boolean; blocked?: boolean; reason?: string };

export const ORCHESTRATOR_FLOW = [
  "analyzePage", "analyzeJob", "evaluatePolicy", "detectDuplicate", "selectResume",
  "analyzeForm", "mapFields", "fillApplication", "validateApplication",
  "submitApplication", "verifySubmission", "saveApplication", "showResult",
] as const;

export function nextStatusAfter(stage: (typeof ORCHESTRATOR_FLOW)[number]): ApplicationStatus {
  const map: Record<string, ApplicationStatus> = {
    analyzePage: "DISCOVERED", analyzeJob: "PARSED", evaluatePolicy: "EVALUATED",
    detectDuplicate: "QUALIFIED", selectResume: "QUALIFIED", analyzeForm: "APPLICATION_STARTED",
    mapFields: "APPLICATION_STARTED", fillApplication: "FORM_FILLED",
    validateApplication: "VALIDATED", submitApplication: "SUBMITTED",
    verifySubmission: "VERIFIED", saveApplication: "VERIFIED", showResult: "VERIFIED",
  };
  return map[stage];
}

export function transition(from: ApplicationStatus, stage: (typeof ORCHESTRATOR_FLOW)[number]): ApplicationStatus {
  const to = nextStatusAfter(stage);
  if (from === to) return from;
  assertTransition(from, to);
  return to;
}
