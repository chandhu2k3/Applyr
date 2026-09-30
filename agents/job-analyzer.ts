import { JobAnalysisSchema, type JobAnalysis } from "@/lib/ai/schemas";

// §11/§15 — JobAnalyzerAgent. Deterministic classification; AI fallback only when ambiguous.

const FAMILY_WEIGHTS: Array<[RegExp, "PM" | "SDE" | "Data" | "Design" | "Marketing", number]> = [
  [/associate product|apm\b|product intern|product analyst|product manager|roadmap|prd\b|user stor|a\/b test|go-?to-?market/i, "PM", 3],
  [/\bsoftware\b|sde\b|backend|frontend|full-?stack|mobile|devops|\breact\b|\bnode\b|python|java\b|leetcode|data structur|algorithm/i, "SDE", 3],
  [/\bdata\b|machine learning|\bml\b|analytics|science|pandas|tensorflow|pytorch/i, "Data", 3],
  [/\bux\b|\bui\b|designer|figma|prototype/i, "Design", 3],
  [/\bmarket|growth|seo|content/i, "Marketing", 3],
];

export function classifyRoleFamily(title: string, description: string): { family: JobAnalysis["roleFamily"]; score: number; ambiguous: boolean } {
  const text = `${title}\n${description}`;
  const scores: Record<string, number> = {};
  for (const [re, family, w] of FAMILY_WEIGHTS) {
    const hits = text.match(new RegExp(re.source, re.flags + "g"))?.length ?? 0;
    scores[family] = (scores[family] ?? 0) + hits * w;
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [top, topScore] = ranked[0] ?? ["Other", 0];
  const runnerUp = ranked[1]?.[1] ?? 0;
  if (topScore === 0) return { family: "Other", score: 0, ambiguous: true };
  return { family: top as JobAnalysis["roleFamily"], score: topScore, ambiguous: topScore - runnerUp < 3 };
}

export function classifySeniority(title: string, description: string): string {
  const t = `${title} ${description}`.toLowerCase();
  if (/intern/i.test(t)) return "Internship";
  if (/junior|entry|associate|0-?1|fresher|new grad/i.test(t)) return "Entry";
  if (/senior|sr\.|staff|principal|lead| 3\+|5\+/i.test(t)) return "Senior";
  return "Entry";
}

export function classifyEmploymentType(title: string, description: string): string {
  const t = `${title} ${description}`.toLowerCase();
  if (/intern/i.test(t)) return "Internship";
  if (/contract/i.test(t)) return "Contract";
  if (/part-?time/i.test(t)) return "Part-time";
  return "Full-time";
}

// A stale/closed posting must never reach matching — it would score
// (and confuse) on listing chrome instead of a real description.
const CLOSED_PATTERNS = [
  /no longer open/i,
  /no longer accepting/i,
  /position has been filled/i,
  /\bjob (not found|has expired|expired|removed)\b/i,
  /this posting is closed/i,
  /applications are (now )?closed/i,
];

export function detectPostingClosed(text: string): boolean {
  return CLOSED_PATTERNS.some((re) => re.test(text));
}

// Company from structured URL patterns first, page title hints second, hostname last.
export function extractCompany(url: string, pageTitle: string, bodyText: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    // boards.greenhouse.io/:company/jobs/:id  ·  job-boards.greenhouse.io/:company/...
    const gh = u.pathname.match(/^\/(?!jobs|search|embed)([^/]+)\//);
    if (host.includes("greenhouse.io") && gh) return prettify(gh[1]);
    // jobs.lever.co/:company/...  (also custom domains running Lever)
    const lv = u.pathname.match(/^\/([^/]+)\//);
    if (host.includes("lever.co") && lv) return prettify(lv[1]);
    // "Company — Job Title" / "Job Title @ Company" title conventions
    const at = pageTitle.match(/[@|—–-]\s*([A-Z][\w&'. ]{1,40})\s*$/);
    if (at) return at[1].trim();
    // Greenhouse/Lever embed the company in headers like "Yext" early in text
    const head = bodyText.slice(0, 600).match(/^([A-Z][\w&'.-]{1,30})\s*\n/);
    if (head && (host.includes("greenhouse") || host.includes("lever"))) return head[1].trim();
    return u.hostname.replace(/^www\.|^jobs\.|^careers\.|^boards\./, "").split(".")[0] ?? "";
  } catch {
    return "";
  }
}

function prettify(slug: string): string {
  const s = slug.replace(/[-_]+/g, " ").trim();
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function analyzeJob(input: { title: string; description: string; url: string; platform?: string; company?: string; location?: string }): JobAnalysis {
  const { family, score, ambiguous } = classifyRoleFamily(input.title, input.description);
  const confidence = ambiguous ? 0.45 : Math.min(0.95, 0.6 + score * 0.05);
  return JobAnalysisSchema.parse({
    company: input.company ?? "",
    title: input.title,
    location: input.location ?? "",
    employmentType: classifyEmploymentType(input.title, input.description),
    seniority: classifySeniority(input.title, input.description),
    roleFamily: family,
    description: input.description.slice(0, 8000),
    requirements: [],
    preferredSkills: [],
    applicationPlatform: input.platform ?? "generic",
    confidence,
  });
}
