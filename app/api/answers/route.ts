import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { AnswerEntrySchema } from "@/agents/answer-matcher";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ answers: await (await getStore()).listAnswers() });
}

export async function POST(req: Request) {
  const b = await req.json();
  const parsed = AnswerEntrySchema.safeParse(b);
  if (!parsed.success) return NextResponse.json({ error: "pattern, answer, category, approved required" }, { status: 400 });
  return NextResponse.json({ answer: await (await getStore()).upsertAnswer({ ...parsed.data, id: typeof b.id === "string" ? b.id : undefined }) }, { status: 201 });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const ok = await (await getStore()).removeAnswer(id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
