import { z } from "zod";

// §21 policy engine — deterministic permission, no LLM here.
export const PolicySchema = z.object({
  enabledRoleFamilies: z.array(z.enum(["PM", "SDE", "Data", "Design", "Marketing", "Other"])).default(["PM", "SDE"]),
  allowedEmploymentTypes: z.array(z.string()).default(["Internship", "Full-time"]),
  maxExperienceYears: z.number().default(2),
  allowedLocations: z.array(z.string()).default([]), // empty = any
  minConfidence: z.number().default(0.7),
  maxPerDay: z.number().default(25),
  maxPerHour: z.number().default(5),
  maxPerCompanyPerDay: z.number().default(2),
  killSwitch: z.boolean().default(false),
});
export type Policy = z.infer<typeof PolicySchema>;

export type PolicyInput = {
  roleFamily: string;
  employmentType: string;
  experienceYears: number;
  location: string;
  confidence: number;
  resumeAvailable: boolean;
};

export function evaluatePolicy(policy: Policy, input: PolicyInput) {
  const reasons: string[] = [];
  const locationUnknown = input.location.trim().length === 0;
  const checks = {
    killSwitchOff: !policy.killSwitch,
    roleSupported: policy.enabledRoleFamilies.includes(input.roleFamily as never),
    employmentAllowed: policy.allowedEmploymentTypes.includes(input.employmentType),
    experienceEligible: input.experienceYears <= policy.maxExperienceYears,
    locationAllowed:
      policy.allowedLocations.length === 0 ||
      (!locationUnknown && policy.allowedLocations.some((l) => input.location.toLowerCase().includes(l.toLowerCase()))),
    confidenceOk: input.confidence >= policy.minConfidence,
    resumeAvailable: input.resumeAvailable,
  };
  if (!checks.killSwitchOff) reasons.push("Kill switch active");
  if (!checks.roleSupported) reasons.push(`Role family ${input.roleFamily} not enabled`);
  if (!checks.employmentAllowed) reasons.push(`Employment type ${input.employmentType} not allowed`);
  if (!checks.experienceEligible) reasons.push("Experience exceeds limit");
  if (!checks.locationAllowed) {
    reasons.push(
      locationUnknown && policy.allowedLocations.length > 0
        ? "Location unknown — cannot verify allowed list"
        : `Location not allowed: ${input.location || "(empty)"}`
    );
  }
  if (!checks.confidenceOk) reasons.push(`Confidence ${input.confidence.toFixed(2)} below threshold ${policy.minConfidence}`);
  if (!checks.resumeAvailable) reasons.push("No active resume");
  const pass = Object.values(checks).every(Boolean);
  // Structural failures: every failed check EXCEPT a pure confidence shortfall.
  // The matcher maps confidence-only failures in the margin band to SKIP.
  const failedChecks = (Object.keys(checks) as Array<keyof typeof checks>).filter((k) => !checks[k] && k !== "confidenceOk");
  return { decision: pass ? ("APPLY" as const) : ("BLOCK" as const), reasons, checks, failedChecks };
}
