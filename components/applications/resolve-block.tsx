"use client";
import { useState } from "react";

// Human-in-the-loop handoff. Two lanes:
// 1. Profile gaps (phone, city…) — fill once, stored to the profile forever.
// 2. One-off questions (CTC, sponsorship…) — answer, optionally approved to the bank.
// Then one click retries the same URL.
export function ResolveBlock({ applicationId, jobUrl, questions, profileFields }: {
  applicationId: string; jobUrl: string; questions: string[]; profileFields: string[];
}) {
  const [qVals, setQVals] = useState<Record<string, string>>({});
  const [pVals, setPVals] = useState<Record<string, string>>({});
  const [saveBank, setSaveBank] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveAll() {
    setBusy(true);
    setMsg("Saving…");
    const prof: Record<string, string> = {};
    for (const f of profileFields) {
      const v = (pVals[f] ?? "").trim();
      if (v) prof[f] = v;
    }
    if (Object.keys(prof).length > 0) {
      await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile: prof }) });
    }
    if (saveBank) {
      for (const q of questions) {
        const answer = (qVals[q] ?? "").trim();
        if (!answer) continue;
        await fetch("/api/answers", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ pattern: q.slice(0, 200), answer: answer.slice(0, 2000), category: "FACTUAL", approved: true }),
        });
      }
    }
    setMsg("Saved. Retry when ready — the agent picks up everything you just gave it.");
    setBusy(false);
  }

  async function retry() {
    setBusy(true);
    setMsg("Starting agent run…");
    const res = await fetch("/api/apply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: jobUrl }) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok || res.status === 202 ? `Run started: ${d.runId?.slice(-8)}. Track it in Agent Runs.` : `Failed: ${d.error ?? "error"}`);
    setBusy(false);
  }

  if (questions.length === 0 && profileFields.length === 0) return null;
  return (
    <div className="panel border-attention/40">
      <div className="panel-header">Needs you — fill this, then retry. Nothing was submitted.</div>
      <div className="space-y-4 p-4">
        {profileFields.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Missing from your profile <span className="font-normal text-neutral-500">(fill once — reused everywhere)</span></p>
            {profileFields.map((f) => (
              <label key={f} className="block text-sm font-mono">{f}
                <input value={pVals[f] ?? ""} onChange={(e) => setPVals({ ...pVals, [f]: e.target.value })} placeholder={`Your ${f}`} className="input-applyx mt-1 w-full" />
              </label>
            ))}
          </div>
        )}
        {questions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Questions only you can answer</p>
            {questions.map((q) => (
              <label key={q} className="block text-sm">{q}
                <input value={qVals[q] ?? ""} onChange={(e) => setQVals({ ...qVals, [q]: e.target.value })} placeholder="Your approved answer" className="input-applyx mt-1 w-full" />
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <input type="checkbox" checked={saveBank} onChange={(e) => setSaveBank(e.target.checked)} /> Remember answers in the answer bank
            </label>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button onClick={saveAll} disabled={busy} className="btn-technical">Save my input</button>
          <button onClick={retry} disabled={busy} className="btn-primary">Retry application</button>
        </div>
        {msg && <p className="text-sm text-neutral-600">{msg}</p>}
        <p className="font-mono text-[11px] text-neutral-400">record {applicationId.slice(-8)}</p>
      </div>
    </div>
  );
}
