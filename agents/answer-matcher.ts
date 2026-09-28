import { z } from "zod";

// §18/§19 — AnswerBankMatcher. Approved answers only; unknown required → BLOCK.

export const AnswerEntrySchema = z.object({
  pattern: z.string(),
  answer: z.string(),
  category: z.enum(["FACTUAL", "LEGAL", "WORK_AUTHORIZATION", "SPONSORSHIP", "PREFERENCE", "SUBJECTIVE"]),
  approved: z.boolean(),
});
export type AnswerEntry = z.infer<typeof AnswerEntrySchema>;

export type AnswerVerdict =
  | { kind: "ANSWERED"; answer: string; entry: AnswerEntry }
  | { kind: "BLOCKED"; reason: string };

function normalize(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function contentWords(s: string): string[] {
  return normalize(s).split(" ").filter((w) => w.length >= 4);
}

// Hit when a meaningful pattern word appears in the question or vice versa
// ("work authorization" ↔ "Are you authorized to work?" via "work").
function patternMatches(pattern: string, question: string): boolean {
  const q = normalize(question);
  const p = normalize(pattern);
  if (!p) return false;
  if (q.includes(p) || p.includes(q)) return true;
  const qw = contentWords(q);
  return contentWords(p).some((w) => qw.some((x) => x.includes(w) || w.includes(x)));
}

export function matchAnswer(question: string, bank: AnswerEntry[]): AnswerVerdict {
  for (const entry of bank) {
    if (!entry.approved) continue;
    if (patternMatches(entry.pattern, question)) return { kind: "ANSWERED", answer: entry.answer, entry };
  }
  return { kind: "BLOCKED", reason: `No approved answer for: "${question}" — BLOCKED, never guess.` };
}

const SEMANTIC_TO_PROFILE: Record<string, string[]> = {
  firstName: ["firstName"],
  lastName: ["lastName"],
  email: ["email"],
  phone: ["phone"],
  linkedin: ["linkedin"],
  github: ["github"],
  portfolio: ["portfolio"],
  workAuthorization: ["workAuthorization"],
  sponsorship: ["sponsorship"],
};

export function answerFromProfile(semanticType: string | null, profile: Record<string, string>): AnswerVerdict {
  if (!semanticType) return { kind: "BLOCKED", reason: "Unmapped field — needs AI mapping or user input" };
  const keys = SEMANTIC_TO_PROFILE[semanticType] ?? [];
  for (const k of keys) {
    if (profile[k]) {
      return { kind: "ANSWERED", answer: profile[k], entry: { pattern: semanticType, answer: profile[k], category: "FACTUAL", approved: true } };
    }
  }
  return { kind: "BLOCKED", reason: `No profile fact for "${semanticType}"` };
}
