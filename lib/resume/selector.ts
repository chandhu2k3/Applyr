import { z } from "zod";

// §14/§17 — deterministic-first resume + field mapping.

export const ResumeSelectionSchema = z.object({
  resumeId: z.string(),
  roleFamily: z.enum(["PM", "SDE", "Data", "Design", "Marketing", "Other"]),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
});
export type ResumeSelection = z.infer<typeof ResumeSelectionSchema>;

export type ResumeMeta = { id: string; roleFamily: string; active: boolean; isDefault: boolean; keywords: string[] };

const PM_HINTS = ["product", "apm", "associate product", "product analyst", "product intern", "roadmap", "prd", "user story", "a/b"];
const SDE_HINTS = ["software", "sde", "backend", "frontend", "full stack", "full-stack", "react", "node", "python", "java ", "leetcode", "dsa"];

function score(text: string, hints: string[]): number {
  const t = text.toLowerCase();
  return hints.filter((h) => t.includes(h)).length;
}

export function selectResumeDeterministic(
  job: { title: string; description: string },
  resumes: ResumeMeta[]
): ResumeSelection | null {
  const text = `${job.title}\n${job.description}`;
  const pm = score(text, PM_HINTS);
  const sde = score(text, SDE_HINTS);
  const family = sde === pm ? null : sde > pm ? "SDE" : "PM";
  if (!family) return null; // ambiguous → caller escalates to LLM/manual
  const pool = resumes.filter((r) => r.roleFamily === family && r.active);
  if (pool.length === 0) return null;
  const chosen = pool.find((r) => r.isDefault) ?? pool[0];
  const confidence = Math.min(0.95, 0.6 + Math.abs(sde - pm) * 0.1);
  return { resumeId: chosen.id, roleFamily: family, reason: `deterministic keyword match pm=${pm} sde=${sde}`, confidence };
}

// Deterministic label → candidate field. Returns null when AI mapping is needed.
const FIELD_RULES: Array<[RegExp, string]> = [
  [/first.?name|given.?name/i, "firstName"],
  [/last.?name|family.?name|sur.?name/i, "lastName"],
  [/email/i, "email"],
  [/phone|mobile/i, "phone"],
  [/linkedin/i, "linkedin"],
  [/github/i, "github"],
  [/portfolio|website/i, "portfolio"],
  [/univers|college|school/i, "education.institution"],
  [/degree/i, "education.degree"],
  [/cgpa|gpa|percentage/i, "education.cgpa"],
  [/graduation|grad.?date/i, "education.endDate"],
  [/resume|cv|upload/i, "resume"],
  [/authoriz|eligible.*work|us work/i, "workAuthorization"],
  [/sponsor/i, "sponsorship"],
  [/relocat/i, "relocation"],
  [/notice.?period/i, "noticePeriod"],
  [/salary|compensation|ctc|expected/i, "salary"],
  [/experience|years/i, "yearsExperience"],
];
export function mapFieldDeterministic(label: string): string | null {
  for (const [re, field] of FIELD_RULES) if (re.test(label)) return field;
  return null;
}
