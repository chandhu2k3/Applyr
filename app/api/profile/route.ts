import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ profile: await getStore().getProfile() });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.profile ?? body)) {
    if (typeof v === "string") clean[k] = v.slice(0, 2000);
  }
  return NextResponse.json({ profile: await getStore().setProfile(clean) });
}
