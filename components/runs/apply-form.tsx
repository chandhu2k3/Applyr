"use client";
import { useState } from "react";

// Paste a job URL → agent runs locally (async) → poll the run → link to result.
export function ApplyForm() {
  const [url, setUrl] = useState("");
  const [dry, setDry] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function poll(runId: string) {
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const d = await fetch("/api/runs").then((r) => r.json()).catch(() => ({ runs: [] }));
      const run = (d.runs ?? []).find((x: { id: string }) => x.id === runId);
      if (run && (run.status === "done" || run.status === "blocked" || run.status === "failed")) {
        const last = run.events?.[run.events.length - 1];
        setMsg(`${run.status.toUpperCase()} · ${run.stage} — ${last?.msg ?? ""} (see Agent Runs / Applications)`);
        setBusy(false);
        return;
      }
    }
    setMsg("Still running — follow it in Agent Runs.");
    setBusy(false);
  }

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!url.startsWith("http")) { setMsg("Paste a full http(s) job URL."); return; }
    setBusy(true);
    setMsg(dry ? "Dry run started — analyzing without touching the form…" : "Agent started — running locally, watch Agent Runs…");
    const res = await fetch("/api/apply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, dryRun: dry }) });
    const d = await res.json().catch(() => ({}));
    if (res.status === 202 && d.runId) poll(d.runId);
    else { setMsg(`Failed: ${d.error ?? "error"}`); setBusy(false); }
  }

  return (
    <form onSubmit={start} className="panel flex flex-wrap items-end gap-3 p-4">
      <label className="min-w-0 flex-1 text-sm">Job / application URL
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://boards.greenhouse.io/…" className="input-applyx mt-1 w-full font-mono text-[12px]" />
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={dry} onChange={(e) => setDry(e.target.checked)} /> Dry run</label>
      <button disabled={busy} className="btn-primary">{busy ? "Running…" : dry ? "Preview plan" : "Apply with Agent"}</button>
      {msg && <p className="w-full text-sm text-neutral-600">{msg}</p>}
    </form>
  );
}

export function ClearHistory() {
  const [msg, setMsg] = useState("");
  async function clear() {
    if (!confirm("Delete ALL applications and runs? Profile, resumes, answers and policy are kept.")) return;
    await fetch("/api/applications", { method: "DELETE" });
    await fetch("/api/runs", { method: "DELETE" });
    setMsg("Cleared.");
    location.reload();
  }
  return (
    <span className="flex items-center gap-2">
      <button onClick={clear} className="btn-danger">Clear history</button>
      {msg && <span className="text-sm text-neutral-500">{msg}</span>}
    </span>
  );
}
