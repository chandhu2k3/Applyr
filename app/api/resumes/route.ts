import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { buildStorageKey } from "@/lib/storage/types";

export const dynamic = "force-dynamic";

// GET list · POST multipart upload (PDF ≤10MB → object storage, metadata in DB)
export async function GET() {
  return NextResponse.json({ resumes: await getStore().listResumes(), storage: getStorage().provider });
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
  const store = getStore();
  const existing = await store.listResumes();
  const version = Math.max(0, ...existing.filter((r) => r.roleFamily === roleFamily).map((r) => r.version)) + 1;
  const rec = await store.createResume({
    name, roleFamily, version,
    storageProvider: stored.provider, storageKey: stored.key,
    mimeType: stored.mimeType, fileSize: stored.size,
    active: true, isDefault: !existing.some((r) => r.roleFamily === roleFamily && r.isDefault),
    keywords: [],
  });
  return NextResponse.json({ resume: rec }, { status: 201 });
}
