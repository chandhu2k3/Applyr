import { z } from "zod";

// §15/§22 — explicit state machine
export const ApplicationStatus = z.enum([
  "DISCOVERED",
  "PARSED",
  "EVALUATED",
  "QUALIFIED",
  "APPLICATION_STARTED",
  "FORM_FILLED",
  "VALIDATED",
  "SUBMITTED",
  "VERIFIED",
  "SKIPPED",
  "BLOCKED",
  "FAILED",
  "SUBMISSION_UNCERTAIN",
  "DUPLICATE",
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatus>;

const ALLOWED: Record<ApplicationStatus, ApplicationStatus[]> = {
  DISCOVERED: ["PARSED", "SKIPPED"],
  PARSED: ["EVALUATED", "SKIPPED", "BLOCKED", "FAILED"],
  EVALUATED: ["QUALIFIED", "SKIPPED", "BLOCKED"],
  QUALIFIED: ["APPLICATION_STARTED", "SKIPPED", "BLOCKED", "DUPLICATE"],
  APPLICATION_STARTED: ["FORM_FILLED", "BLOCKED", "FAILED"],
  FORM_FILLED: ["VALIDATED", "BLOCKED", "FAILED"],
  VALIDATED: ["SUBMITTED", "BLOCKED", "FAILED"],
  SUBMITTED: ["VERIFIED", "SUBMISSION_UNCERTAIN", "FAILED"],
  VERIFIED: [],
  SKIPPED: [],
  BLOCKED: [],
  FAILED: [],
  SUBMISSION_UNCERTAIN: [],
  DUPLICATE: [],
};

export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return ALLOWED[from].includes(to);
}

export function assertTransition(from: ApplicationStatus, to: ApplicationStatus): void {
  if (!canTransition(from, to)) throw new Error(`Illegal transition ${from} -> ${to}`);
}
