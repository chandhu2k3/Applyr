import { evaluatePolicy, type Policy } from "@/lib/policy/engine";
import type { JobAnalysis } from "@/lib/ai/schemas";

// CandidateMatcherAgent — semantic fit scoring feeding the deterministic policy engine.

export type MatchInput = {
  job: JobAnalysis;
  candidateSkills: string[];
  candidateExperienceYears: number;
};

export type MatchResult = {
  confidence: number;
  reasons: string[];
  skillOverlap: string[];
  decision: "APPLY" | "SKIP" | "BLOCK";
};

const SKILL_TOKENS = ["react", "node", "python", "java", "typescript", "sql", "figma", "roadmap", "a/b", "excel", "git", "aws", "product", "api", "dsa"];

export function scoreFit(input: MatchInput): { confidence: number; reasons: string[]; skillOverlap: string[] } {
  const reasons: string[] = [];
  const hay = `${input.job.title} ${input.job.description}`.toLowerCase();
  const overlap = SKILL_TOKENS.filter((s) => hay.includes(s) && input.candidateSkills.map((c) => c.toLowerCase()).includes(s));
  let score = 0.4; // base: page is a real job
  if (overlap.length > 0) {
    score += Math.min(0.3, overlap.length * 0.1);
    reasons.push(`skill overlap: ${overlap.join(", ")}`);
  } else reasons.push("no direct skill overlap");
  if (input.candidateExperienceYears <= 2) {
    score += 0.1;
    reasons.push("experience in 0–2y band");
  }
  if (input.job.roleFamily === "PM" || input.job.roleFamily === "SDE") {
    score += 0.1;
    reasons.push(`supported family ${input.job.roleFamily}`);
  } else reasons.push(`unsupported family ${input.job.roleFamily}`);
  return { confidence: Math.min(0.98, score), reasons, skillOverlap: overlap };
}

export function matchCandidate(input: MatchInput, policy: Policy, resumeAvailable: boolean): MatchResult {
  const fit = scoreFit(input);
  const verdict = evaluatePolicy(policy, {
    roleFamily: input.job.roleFamily,
    employmentType: input.job.employmentType,
    experienceYears: input.candidateExperienceYears,
    location: input.job.location,
    confidence: Math.min(fit.confidence, input.job.confidence),
    resumeAvailable,
  });
  return { ...fit, decision: verdict.decision === "APPLY" ? "APPLY" : "BLOCK", reasons: [...fit.reasons, ...verdict.reasons] };
}
