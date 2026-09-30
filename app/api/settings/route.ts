import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { supabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await getStore();
  return NextResponse.json({ settings: await store.getSettings(), persistence: store.kind });
}

export async function PUT(req: Request) {
  const b = await req.json();
  const store = await getStore();
  const settings = await store.setSettings({
    ...(b.killSwitch !== undefined ? { killSwitch: Boolean(b.killSwitch) } : {}),
    ...(b.retentionDays !== undefined ? { retentionDays: Math.max(1, Math.min(365, Number(b.retentionDays))) } : {}),
  });
  return NextResponse.json({ settings, persistence: store.kind, supabase: supabaseConfigured() });
}
