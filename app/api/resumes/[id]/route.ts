import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH { active?, isDefault?, name? } · DELETE (removes metadata; file retention per settings)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const patch = await req.json();
  const store = getStore();
  if (patch.isDefault) {
    const all = await store.listResumes();
    const cur = all.find((r) => r.id === params.id);
    if (cur) {
      for (const r of all.filter((x) => x.roleFamily === cur.roleFamily && x.id !== cur.id && x.isDefault)) {
        await store.updateResume(r.id, { isDefault: false });
      }
    }
  }
  const rec = await store.updateResume(params.id, {
    ...(patch.active !== undefined ? { active: Boolean(patch.active) } : {}),
    ...(patch.isDefault !== undefined ? { isDefault: Boolean(patch.isDefault) } : {}),
    ...(typeof patch.name === "string" ? { name: patch.name.slice(0, 120) } : {}),
  });
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ resume: rec });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ok = await getStore().removeResume(params.id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
