import { skillOverlap } from "@/lib/skills";

// THE fit model. Every number lives here, documented, weights sum to 1.0.
// Fit measures candidate↔job alignment only; job-analysis uncertainty is
// applied afterwards as min(fit, job.confidence) so the two are never conflated.

export const FIT_WEIGHTS = {
  /** Page passed analysis as a real job (participation, not quality). */
  base: 0.3,
  /** Shared-vocabulary skill overlap: 0.13 per skill, capped. */
  skillsPerHit: 0.13,
  skillsMax: 0.4,
  /** Candidate years inside the policy band. */
  experience: 0.1,
  /** Role family is one the user enabled. */
  family: 0.2,
} as const;

/** Below APPLY threshold but above this floor → SKIP (recorded, no application). */
export const SKIP_FLOOR = 0.45;

export type FitMetric = {
  key: string;
  label: string;
  points: number;
  max: number;
  detail: string;
};

export type FitResult = {
  confidence: number;
  metrics: FitMetric[];
  skillOverlap: string[];
  /** True when the profile has no skills at all — the matcher is blind. */
  blind: boolean;
  reasons: string[];
};

export type FitInput = {
  title: string;
  description: string;
  roleFamily: string;
  enabledFamilies: string[];
  candidateSkills: string[];
  candidateExperienceYears: number;
  maxExperienceYears: number;
};

export function computeFit(input: FitInput): FitResult {
  const metrics: FitMetric[] = [];
  const reasons: string[] = [];
  const text = `${input.title} ${input.description}`;

  metrics.push({
    key: "base", label: "Analyzed job page", points: FIT_WEIGHTS.base, max: FIT_WEIGHTS.base,
    detail: "page passed job/application detection",
  });

  const overlap = skillOverlap(text, input.candidateSkills);
  const blind = input.candidateSkills.length === 0;
  const skillPoints = Math.min(FIT_WEIGHTS.skillsMax, overlap.length * FIT_WEIGHTS.skillsPerHit);
  metrics.push({
    key: "skills", label: "Skill overlap", points: skillPoints, max: FIT_WEIGHTS.skillsMax,
    detail: blind
      ? "matcher blind: profile has no skills — add skills to enable matching"
      : overlap.length > 0 ? `overlap: ${overlap.join(", ")}` : "no shared-vocabulary overlap",
  });
  reasons.push(metrics[1].detail);

  const expOk = input.candidateExperienceYears <= input.maxExperienceYears;
  metrics.push({
    key: "experience", label: "Experience in band", points: expOk ? FIT_WEIGHTS.experience : 0, max: FIT_WEIGHTS.experience,
    detail: expOk
      ? `${input.candidateExperienceYears}y within 0–${input.maxExperienceYears}y band`
      : `${input.candidateExperienceYears}y exceeds ${input.maxExperienceYears}y limit`,
  });
  reasons.push(metrics[2].detail);

  const familyOk = input.enabledFamilies.includes(input.roleFamily);
  metrics.push({
    key: "family", label: "Enabled role family", points: familyOk ? FIT_WEIGHTS.family : 0, max: FIT_WEIGHTS.family,
    detail: familyOk ? `supported family ${input.roleFamily}` : `family ${input.roleFamily} not enabled`,
  });
  reasons.push(metrics[3].detail);

  const confidence = Math.min(0.98, metrics.reduce((s, m) => s + m.points, 0));
  return { confidence, metrics, skillOverlap: overlap, blind, reasons };
}
