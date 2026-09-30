"use client";
import { useEffect, useState } from "react";

export default function PoliciesPage() {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/policy").then((r) => r.json()).then((d) => setText(JSON.stringify(d.policy, null, 2))).catch(() => {});
  }, []);

  async function save() {
    setMsg("Saving…");
    try {
      const res = await fetch("/api/policy", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ policy: JSON.parse(text) }) });
      setMsg(res.ok ? "Policy saved — enforced on every run." : "Invalid policy JSON");
    } catch {
      setMsg("Invalid JSON");
    }
  }

  return (
    <div className="max-w-2xl space-y-3">
      <h1 className="text-xl font-bold">Policies — deterministic permission</h1>
      <p className="text-sm text-neutral-500">The policy engine returns APPLY / BLOCK. The LLM never overrides it.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={16} spellCheck={false} className="input-applyx w-full font-mono text-[12px]" style={{ height: "auto" }} />
      <button onClick={save} className="btn-primary">Save policy</button>
      {msg && <p className="text-sm text-neutral-600">{msg}</p>}
    </div>
  );
}
