import { z } from "zod";
import { mapFieldDeterministic } from "@/lib/resume/selector";

// §16/§24 — PageAnalyzerAgent. Deterministic first; AI only for ambiguous labels.

export const PageFieldSchema = z.object({
  tag: z.string(),
  type: z.string().default(""),
  label: z.string().default(""),
  name: z.string().default(""),
  required: z.boolean().default(false),
});
export type PageField = z.infer<typeof PageFieldSchema>;

export const PagePayloadSchema = z.object({
  url: z.string(),
  title: z.string().default(""),
  bodyText: z.string().default(""),
  fields: z.array(PageFieldSchema).default([]),
});
export type PagePayload = z.infer<typeof PagePayloadSchema>;

export type Platform = "greenhouse" | "lever" | "google-forms" | "generic";

export function detectPlatform(url: string, bodyText = ""): Platform {
  const u = url.toLowerCase();
  if (u.includes("boards.greenhouse.io") || u.includes("greenhouse.io") || bodyText.includes("boards.greenhouse.io")) return "greenhouse";
  if (u.includes("jobs.lever.co") || u.includes("lever.co")) return "lever";
  if (u.includes("docs.google.com/forms") || u.includes("forms.gle")) return "google-forms";
  return "generic";
}

const JOB_SIGNALS = ["apply", "job description", "responsibilities", "requirements", "qualifications", "about the role", "what you'll do"];
const SECURITY_SIGNALS = [
  { re: /captcha|recaptcha|hcaptcha|cf-turnstile/i, kind: "CAPTCHA" },
  { re: /enter (the )?(otp|verification code|one-?time)/i, kind: "OTP" },
  { re: /two-?factor|2fa|authenticator/i, kind: "2FA" },
  { re: /sign in|log in|login required/i, kind: "LOGIN_REQUIRED" },
] as const;

export type PageAnalysis = {
  platform: Platform;
  isJobPage: boolean;
  jobSignals: number;
  securityBlock: string | null;
  fields: Array<PageField & { semanticType: string | null; needsAI: boolean }>;
  unmappedRequired: string[];
};

export function analyzePage(raw: unknown): PageAnalysis {
  const payload = PagePayloadSchema.parse(raw);
  const platform = detectPlatform(payload.url, payload.bodyText);
  const text = `${payload.title}\n${payload.bodyText}`.toLowerCase();
  const jobSignals = JOB_SIGNALS.filter((s) => text.includes(s)).length;
  const isJobPage = jobSignals >= 2 || payload.fields.length > 0;

  let securityBlock: string | null = null;
  for (const s of SECURITY_SIGNALS) {
    if (s.re.test(payload.bodyText) || (s.kind === "LOGIN_REQUIRED" && payload.fields.some((f) => /password/i.test(`${f.label} ${f.name} ${f.type}`)))) {
      securityBlock = s.kind;
      break;
    }
  }

  const fields = payload.fields.map((f) => {
    const semanticType = mapFieldDeterministic(`${f.label} ${f.name}`);
    return { ...f, semanticType, needsAI: semanticType === null };
  });
  const unmappedRequired = fields.filter((f) => f.required && f.semanticType === null).map((f) => f.label || f.name || f.type);

  return { platform, isJobPage, jobSignals, securityBlock, fields, unmappedRequired };
}
