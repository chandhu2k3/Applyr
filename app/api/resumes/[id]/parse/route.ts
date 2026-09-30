import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { extractPdfText, mergeIntoProfile, parseResumeProfile } from "@/lib/resume/parse";

export const dynamic = "force-dynamic";

// POST /api/resumes/:id/parse — (re)parse stored PDF into the profile.
// Fills only empty fields; existing user data always wins.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const store = getStore();
  const rec = (await store.listResumes()).find((r) => r.id === params.id);
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const data = await getStorage().download(rec.storageKey);
    const parsed = parseResumeProfile(await extractPdfText(data));
    const current = await store.getProfile();
    const { merged, filled } = mergeIntoProfile(current, parsed.profile);
    if (filled.length > 0) await store.setProfile(merged);
    await store.updateResume(rec.id, { keywords: parsed.profile.skills.slice(0, 30) });
    return NextResponse.json({ filled, missing: parsed.missing, skillsFound: parsed.profile.skills.length });
  } catch (e) {
    return NextResponse.json({ error: `Parse failed: ${e instanceof Error ? e.message : e}` }, { status: 500 });
  }
}
