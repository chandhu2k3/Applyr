import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ applications: await (await getStore()).listApplications() });
}

export async function DELETE() {
  await (await getStore()).clearHistory();
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const b = await req.json();
  if (!b.company || !b.title || !b.url) {
    return NextResponse.json({ error: "company, title, url required" }, { status: 400 });
  }
  const rec = await (await getStore()).createApplication({
    company: String(b.company).slice(0, 200), title: String(b.title).slice(0, 300),
    location: String(b.location ?? "").slice(0, 200), url: String(b.url).slice(0, 2000),
    platform: String(b.platform ?? "generic").slice(0, 40),
    resumeId: String(b.resumeId ?? ""), resumeName: String(b.resumeName ?? ""),
    status: String(b.status ?? "SUBMITTED"), verification: String(b.verification ?? ""),
    applicationId: b.applicationId ? String(b.applicationId) : null,
    answers: typeof b.answers === "object" && b.answers ? b.answers : {},
    missingQuestions: Array.isArray(b.missingQuestions) ? b.missingQuestions.map(String).slice(0, 20) : [],
    missingProfile: Array.isArray(b.missingProfile) ? b.missingProfile.map(String).slice(0, 20) : [],
  });
  return NextResponse.json({ application: rec }, { status: 201 });
}
