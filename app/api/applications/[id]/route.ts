import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const rec = await (await getStore()).getApplication(params.id);
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ application: rec });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const b = await req.json();
  const store = await getStore();
  if (b.status) await store.setAppStatus(params.id, String(b.status), String(b.verification ?? ""));
  if (b.event) await store.addAppEvent(params.id, { t: new Date().toISOString(), type: String(b.event), meta: b.meta ?? {} });
  return NextResponse.json({ application: await store.getApplication(params.id) });
}
