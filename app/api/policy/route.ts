import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { PolicySchema } from "@/lib/policy/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const stored = await getStore().getPolicy();
  const policy = PolicySchema.safeParse(stored).success ? stored : PolicySchema.parse({});
  return NextResponse.json({ policy });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const parsed = PolicySchema.safeParse(body.policy ?? body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid policy" }, { status: 400 });
  return NextResponse.json({ policy: await getStore().setPolicy(parsed.data) });
}
