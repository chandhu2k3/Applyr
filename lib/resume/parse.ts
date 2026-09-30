// Resume → profile parsing. Deterministic extractors only — the parser proposes,
// the user approves. It NEVER invents: anything unfound lands in `missing[]`.
import { SKILL_VOCABULARY, canonicalSkill } from "@/lib/skills";

export type ParsedProfile = {
  firstName: string; lastName: string; email: string; phone: string;
  city: string; linkedin: string; github: string;
  skills: string[]; experienceYears: string;
  education: string; degree: string;
};

export type ParseResult = { profile: ParsedProfile; missing: string[] };

export async function extractPdfText(data: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data), useSystemFonts: true }).promise;
  const chunks: string[] = [];
  const pages = Math.min(doc.numPages, 10);
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = "";
    for (const it of content.items) {
      const s = "str" in (it as object) ? String((it as { str: unknown }).str) : "";
      line += s ? s + " " : "";
      if ((it as { hasEOL?: boolean }).hasEOL) {
        chunks.push(line.trim());
        line = "";
      }
    }
    if (line.trim()) chunks.push(line.trim());
    chunks.push(""); // page break
  }
  await (doc as unknown as { cleanup(): Promise<void> }).cleanup().catch(() => {});
  return chunks.join("\n");
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseResumeProfile(rawText: string): ParseResult {
  const text = rawText.replace(/\r/g, " ");
  const lower = text.toLowerCase();
  const p: ParsedProfile = {
    firstName: "", lastName: "", email: "", phone: "", city: "",
    linkedin: "", github: "", skills: [], experienceYears: "", education: "", degree: "",
  };

  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (email) p.email = email[0];
  const phone = text.match(/(\+91[\s-]?)?[6-9]\d{9}/) ?? text.match(/\+\d[\d\s-]{7,15}\d/);
  if (phone) p.phone = phone[0].trim();
  const li = lower.match(/linkedin\.com\/in\/[\w-]+/);
  if (li) p.linkedin = "https://" + li[0];
  const gh = lower.match(/github\.com\/[\w-]+/);
  if (gh) p.github = "https://" + gh[0];

  // Name: explicit label or first plausible headline line.
  const nameLabel = text.match(/(?:name|candidate)\s*[:–-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/);
  if (nameLabel) {
    const parts = nameLabel[1].trim().split(/\s+/);
    p.firstName = parts[0]; p.lastName = parts.slice(1).join(" ");
  } else {
    const firstLine = text.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? "";
    const m = firstLine.match(/^([A-Z][a-zA-Z'.-]{1,20})\s+([A-Z][a-zA-Z'.-]{1,20}(?:\s+[A-Z][a-zA-Z'.-]{1,20}){0,2})/);
    if (m && !/\d|@|resume|curriculum/i.test(firstLine)) {
      p.firstName = m[1]; p.lastName = m[2];
    }
  }

  // Skills from the shared vocabulary (same list the matcher scores with).
  const found = new Set<string>();
  for (const skill of SKILL_VOCABULARY) {
    if (new RegExp(`(?<![\\w+#./-])${esc(skill.toLowerCase())}(?![\\w+#./-])`, "i").test(lower)) {
      found.add(canonicalSkill(skill));
    }
  }
  p.skills = Array.from(found).sort();

  // Education.
  const deg = text.match(/\b(B\.?Tech|M\.?Tech|B\.?E\b|M\.?E\b|MBA|BCA|MCA|B\.?Sc|M\.?Sc|BBA|Ph\.?D)\b[^,\n]{0,60}/i);
  if (deg) p.degree = deg[0].trim().slice(0, 120);
  const inst = text.split("\n").find((l) => /\b(IIT|NIT|IIIT|BITS|university|college|institute of|school of)\b/i.test(l));
  if (inst) p.education = inst.trim().slice(0, 160);

  // Experience: explicit "N years" else date-range sum.
  const yrs = Array.from(lower.matchAll(/(\d+(?:\.\d+)?)\+?\s*(years?|yrs?)/g)).map((m) => Number(m[1])).filter((n) => n <= 15);
  if (yrs.length > 0) {
    p.experienceYears = String(Math.max(...yrs));
  } else {
    const ranges = Array.from(text.matchAll(/(20\d{2})\s*[–—-]\s*(20\d{2}|present|current)/gi));
    if (ranges.length > 0) {
      const nowY = new Date().getFullYear();
      const total = ranges.reduce((s, m) => s + (m[2].match(/20\d{2}/) ? Number(m[2]) - Number(m[1]) : nowY - Number(m[1])), 0);
      if (total > 0 && total <= 15) p.experienceYears = String(total);
    }
  }

  const missing: string[] = [];
  if (!p.firstName) missing.push("firstName");
  if (!p.email) missing.push("email");
  if (!p.phone) missing.push("phone");
  if (!p.city) missing.push("city");
  if (p.skills.length === 0) missing.push("skills");
  if (!p.experienceYears) missing.push("experienceYears");
  if (!p.linkedin) missing.push("linkedin");
  if (!p.github) missing.push("github");
  return { profile: p, missing };
}

// Merge parsed data into the stored profile: fill ONLY empty fields,
// union skills. Existing user data always wins.
export function mergeIntoProfile(existing: Record<string, string>, parsed: ParsedProfile): { merged: Record<string, string>; filled: string[] } {
  const merged = { ...existing };
  const filled: string[] = [];
  const fill = (key: string, val: string) => {
    if (val && !merged[key]) {
      merged[key] = val;
      filled.push(key);
    }
  };
  fill("firstName", parsed.firstName);
  fill("lastName", parsed.lastName);
  fill("email", parsed.email);
  fill("phone", parsed.phone);
  fill("city", parsed.city);
  fill("linkedin", parsed.linkedin);
  fill("github", parsed.github);
  fill("experienceYears", parsed.experienceYears);
  if (parsed.skills.length > 0) {
    const have = new Set((merged.skills ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
    const add = parsed.skills.filter((s) => !have.has(s.toLowerCase()));
    if (add.length > 0) {
      merged.skills = [...(merged.skills ? [merged.skills] : []), ...add].join(", ");
      filled.push(`skills(+${add.length})`);
    }
  }
  return { merged, filled };
}

const REQUIRED = ["firstName", "lastName", "email", "phone", "city", "skills", "experienceYears"];

export function completeness(profile: Record<string, string>): { complete: number; total: number; missing: string[] } {
  const missing = REQUIRED.filter((k) => !profile[k]);
  return { complete: REQUIRED.length - missing.length, total: REQUIRED.length, missing };
}
