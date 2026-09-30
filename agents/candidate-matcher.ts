import { evaluatePolicy, type Policy } from "@/lib/policy/engine";
import { computeFit, SKIP_FLOOR, type FitMetric } from "@/lib/decision/metrics";
import type { JobAnalysis } from "@/lib/ai/schemas";

// CandidateMatcherAgent — thin orchestration over the decision model.
// Fit math lives in lib/decision/metrics; permission in lib/policy/engine.

export type MatchInput = {
  job: JobAnalysis;
  candidateSkills: string[];
  candidateExperienceYears: number;
};

export type MatchResult = {
  confidence: number;
  reasons: string[];
  skillOverlap: string[];
  metrics: FitMetric[];
  decision: "APPLY" | "SKIP" | "BLOCK";
};

export function matchCandidate(input: MatchInput, policy: Policy, resumeAvailable: boolean): MatchResult {
  const fit = computeFit({
    title: input.job.title,
    description: input.job.description,
    roleFamily: input.job.roleFamily,
    enabledFamilies: [...policy.enabledRoleFamilies],
    candidateSkills: input.candidateSkills,
    candidateExperienceYears: input.candidateExperienceYears,
    maxExperienceYears: policy.maxExperienceYears,
  });
  // Job-analysis uncertainty caps fit — kept visible as its own reason.
  const confidence = Math.min(fit.confidence, input.job.confidence);
  const verdict = evaluatePolicy(policy, {
    roleFamily: input.job.roleFamily,
    employmentType: input.job.employmentType,
    experienceYears: input.candidateExperienceYears,
    location: input.job.location,
    confidence,
    resumeAvailable,
  });
  if (verdict.decision === "APPLY") {
    return { confidence, reasons: [...fit.reasons, "policy: all checks pass"], skillOverlap: fit.skillOverlap, metrics: fit.metrics, decision: "APPLY" };
  }
  if (verdict.failedChecks.length === 0 && confidence >= SKIP_FLOOR) {
    return { confidence, reasons: [...fit.reasons, `below apply threshold ${policy.minConfidence} — skipped quietly`, ...verdict.reasons], skillOverlap: fit.skillOverlap, metrics: fit.metrics, decision: "SKIP" };
  }
  return { confidence, reasons: [...fit.reasons, ...verdict.reasons], skillOverlap: fit.skillOverlap, metrics: fit.metrics, decision: "BLOCK" };
}
