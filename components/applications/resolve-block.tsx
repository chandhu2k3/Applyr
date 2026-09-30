"use client";
import { useState } from "react";

// Human-in-the-loop: answer the questions that blocked this application,
// approve them into the bank, then retry the same URL.
export function ResolveBlock({ applicationId, jobUrl, questions }: { applicationId: string; jobUrl: string; questions: string[] }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function approveAll() {
    setBusy(true);
    setMsg("Saving answers…");
    for (const q of questions) {
      const answer = (vals[q] ?? "").trim();
      if (!answer) continue;
      await fetch("/api/answers", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ pattern: q.slice(0, 200), answer: answer.slice(0, 2000), category: "FACTUAL", approved: true }),
      });
    }
    setMsg("Approved. Retry when ready — the agent will pick up your answers.");
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

  if (questions.length === 0) return null;
  return (
    <div className="panel border-attention/40">
      <div className="panel-header">Needs your input — {questions.length} question{questions.length > 1 ? "s" : ""} blocked this application</div>
      <div className="space-y-2 p-4">
        {questions.map((q) => (
          <label key={q} className="block text-sm">{q}
            <input value={vals[q] ?? ""} onChange={(e) => setVals({ ...vals, [q]: e.target.value })} placeholder="Your approved answer" className="input-applyx mt-1 w-full" />
          </label>
        ))}
        <div className="flex gap-2 pt-1">
          <button onClick={approveAll} disabled={busy} className="btn-technical">Approve answers</button>
          <button onClick={retry} disabled={busy} className="btn-primary">Retry application</button>
        </div>
        {msg && <p className="text-sm text-neutral-600">{msg}</p>}
        <p className="font-mono text-[11px] text-neutral-400">record {applicationId.slice(-8)} · answers go to the approved bank</p>
      </div>
    </div>
  );
}
