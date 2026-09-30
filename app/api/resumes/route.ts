import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { buildStorageKey } from "@/lib/storage/types";
import { extractPdfText, mergeIntoProfile, parseResumeProfile } from "@/lib/resume/parse";

export const dynamic = "force-dynamic";

// GET list · POST multipart upload (PDF ≤10MB → object storage, metadata in DB)
export async function GET() {
  return NextResponse.json({ resumes: await (await getStore()).listResumes(), storage: getStorage().provider });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const name = String(form.get("name") ?? "Resume").slice(0, 120);
  const roleFamily = String(form.get("roleFamily") ?? "SDE").slice(0, 20);
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 10MB" }, { status: 400 });
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  const key = buildStorageKey("resume", "local-user", `${name.replace(/\s+/g, "_")}.pdf`);
  const stored = await getStorage().upload(key, buf, file.type || "application/pdf");
  const store = await getStore();
  const existing = await store.listResumes();
  const version = Math.max(0, ...existing.filter((r) => r.roleFamily === roleFamily).map((r) => r.version)) + 1;
  const rec = await store.createResume({
    name, roleFamily, version,
    storageProvider: stored.provider, storageKey: stored.key,
    mimeType: stored.mimeType, fileSize: stored.size,
    active: true, isDefault: !existing.some((r) => r.roleFamily === roleFamily && r.isDefault),
    keywords: [],
  });

  // Parse the resume → auto-fill empty profile fields, report what's still missing.
  // Best-effort: upload succeeds even if parsing fails.
  let parse: { filled: string[]; missing: string[]; skillsFound: number } | null = null;
  try {
    const text = await extractPdfText(buf);
    const parsed = parseResumeProfile(text);
    const current = await store.getProfile();
    const { merged, filled } = mergeIntoProfile(current, parsed.profile);
    if (filled.length > 0) await store.setProfile(merged);
    parse = { filled, missing: parsed.missing, skillsFound: parsed.profile.skills.length };
  } catch (e) {
    console.error("[resume-parse]", e instanceof Error ? `${e.name}: ${e.message}` : e);
    parse = { filled: [], missing: ["parse-failed"], skillsFound: 0 };
  }
  return NextResponse.json({ resume: rec, parse }, { status: 201 });
}
