import { z } from "zod";

// §27 validation gate — all deterministic.
export const ValidationResultSchema = z.object({
  ok: z.boolean(),
  failures: z.array(z.string()),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export type ValidationInput = {
  company: string;
  title: string;
  resumeId: string | null;
  resumeUploaded: boolean;
  requiredFields: Array<{ label: string; filled: boolean }>;
  unknownRequired: string[];
  fabricated: boolean;
  policyDecision: "APPLY" | "SKIP" | "BLOCK";
  duplicate: boolean;
  visibleErrors: string[];
};

export function runValidationGate(input: ValidationInput): ValidationResult {
  const failures: string[] = [];
  if (!input.company) failures.push("Missing company");
  if (!input.title) failures.push("Missing title");
  if (!input.resumeId) failures.push("No resume selected");
  if (!input.resumeUploaded) failures.push("Resume upload not confirmed");
  for (const f of input.requiredFields) if (!f.filled) failures.push(`Required field empty: ${f.label}`);
  if (input.unknownRequired.length > 0) failures.push(`Unknown required: ${input.unknownRequired.join(", ")}`);
  if (input.fabricated) failures.push("Fabricated/untrusted data detected");
  if (input.policyDecision !== "APPLY") failures.push(`Policy decision is ${input.policyDecision}`);
  if (input.duplicate) failures.push("Duplicate application");
  if (input.visibleErrors.length > 0) failures.push(`Page errors: ${input.visibleErrors.join("; ")}`);
  return { ok: failures.length === 0, failures };
}

export function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function isDuplicate(job: { url: string; company: string; title: string; location: string }, existing: typeof job[]): boolean {
  const n = normalizeTitle(job.title);
  return existing.some(
    (e) =>
      e.url === job.url ||
      (e.company.toLowerCase() === job.company.toLowerCase() && normalizeTitle(e.title) === n && e.location.toLowerCase() === job.location.toLowerCase())
  );
}
