import type { FormDriver } from "../executor";

// Platform adapter contract: isolated per-ATS logic. Generic handles the rest.
export interface FillPlan {
  field: { label: string; name: string; type: string; tag: string };
  action: "text" | "select" | "check" | "upload" | "skip";
  value: string;
}

export interface ApplicationAdapter {
  readonly id: string;
  canHandle(url: string): boolean;
  // Platform-specific submit control name (falls back to executor default).
  submitName?: RegExp;
  // Strong success signals for this platform.
  successSignals: RegExp[];
  // Map a semantic type to a platform quirk (e.g. Lever custom dropdowns).
  note?: string;
}

export const GenericAdapter: ApplicationAdapter = {
  id: "generic",
  canHandle: () => true,
  successSignals: [/application (submitted|received|complete)/i, /thank you for applying/i, /confirmation/i, /application id|reference\s*[:#]/i],
};

export const GreenhouseAdapter: ApplicationAdapter = {
  id: "greenhouse",
  canHandle: (u) => u.includes("greenhouse.io"),
  successSignals: [/your application has been submitted/i, /thank you/i, /confirmation/i, ...GenericAdapter.successSignals],
  note: "Greenhouse renders #app-root with labeled inputs; demographic questions are optional and skipped.",
};

export const LeverAdapter: ApplicationAdapter = {
  id: "lever",
  canHandle: (u) => u.includes("lever.co"),
  successSignals: [/thanks for applying/i, /application complete/i, ...GenericAdapter.successSignals],
  note: "Lever uses custom dropdowns — executor select() falls back to fill when needed.",
};

export const GoogleFormsAdapter: ApplicationAdapter = {
  id: "google-forms",
  canHandle: (u) => u.includes("docs.google.com/forms") || u.includes("forms.gle"),
  successSignals: [/response (recorded|submitted)/i, /your response has been recorded/i],
  note: "File upload often requires sign-in → expect LOGIN_REQUIRED pause.",
};

export const ADAPTERS = [GreenhouseAdapter, LeverAdapter, GoogleFormsAdapter, GenericAdapter];

export function pickAdapter(url: string): ApplicationAdapter {
  return ADAPTERS.find((a) => a.id !== "generic" && a.canHandle(url)) ?? GenericAdapter;
}

export function detectSecurityHalt(text: string): string | null {
  if (/captcha|recaptcha|hcaptcha|cf-turnstile/i.test(text)) return "CAPTCHA";
  if (/enter (the )?(otp|verification code)/i.test(text)) return "OTP";
  if (/two-?factor|2fa/i.test(text)) return "2FA";
  if (/sign in|log in to (apply|continue)/i.test(text)) return "LOGIN_REQUIRED";
  return null;
}

export type { FormDriver };
