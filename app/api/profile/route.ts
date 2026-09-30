import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ profile: await (await getStore()).getProfile() });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.profile ?? body)) {
    if (typeof v === "string") clean[k] = v.slice(0, 2000);
    else if (typeof v === "number") clean[k] = String(v);
  }
  return NextResponse.json({ profile: await (await getStore()).setProfile(clean) });
}
