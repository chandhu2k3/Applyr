"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/card";

type Answer = { id: string; pattern: string; answer: string; category: string; approved: boolean };
const CATS = ["FACTUAL", "LEGAL", "WORK_AUTHORIZATION", "SPONSORSHIP", "PREFERENCE", "SUBJECTIVE"];

export default function AnswerBankPage() {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [pattern, setPattern] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("FACTUAL");

  async function refresh() {
    const d = await fetch("/api/answers").then((r) => r.json()).catch(() => ({ answers: [] }));
    setAnswers(d.answers ?? []);
  }
  useEffect(() => { refresh(); }, []);

  async function save(e: React.FormEvent, existing?: Answer) {
    e.preventDefault();
    await fetch("/api/answers", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(existing ? { ...existing, approved: true } : { pattern, answer, category, approved: true }),
    });
    setPattern(""); setAnswer("");
    refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/answers?id=${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Answer Bank — approved answers only</h1>
      <p className="text-sm text-neutral-500">Unknown required question + no approved answer = BLOCKED. Never guess.</p>
      <form onSubmit={(e) => save(e)} className="panel flex flex-wrap items-end gap-3 p-4">
        <label className="text-sm">Question pattern<input value={pattern} onChange={(e) => setPattern(e.target.value)} required className="input-applyx mt-1 block w-64" placeholder="require sponsorship" /></label>
        <label className="text-sm">Approved answer<input value={answer} onChange={(e) => setAnswer(e.target.value)} required className="input-applyx mt-1 block w-64" /></label>
        <label className="text-sm">Category<select value={category} onChange={(e) => setCategory(e.target.value)} className="input-applyx mt-1 block">{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
        <button className="btn-primary">Approve + save</button>
      </form>
      <div className="panel">
        <div className="panel-header">Approved + pending ({answers.length})</div>
        <table className="w-full text-left text-[13px]">
          <thead><tr className="border-b border-hairline font-mono text-[11px] uppercase text-neutral-400">
            <th className="px-4 py-2 font-medium">Pattern</th><th className="px-4 py-2 font-medium">Answer</th><th className="px-4 py-2 font-medium">Category</th><th className="px-4 py-2 font-medium">State</th><th className="px-4 py-2 font-medium">Actions</th>
          </tr></thead>
          <tbody>{answers.map((a) => (
            <tr key={a.id} className="border-b border-hairline last:border-0">
              <td className="px-4 py-2">{a.pattern}</td>
              <td className="px-4 py-2 text-neutral-600">{a.answer || <i className="text-neutral-400">— needs your answer</i>}</td>
              <td className="px-4 py-2 font-mono text-[12px]">{a.category}</td>
              <td className="px-4 py-2"><Badge tone={a.approved ? "verified" : "attention"}>{a.approved ? "Approved" : "Pending"}</Badge></td>
              <td className="px-4 py-2 text-[12px]">
                {!a.approved
                  ? <span className="flex gap-2"><input id={`ans-${a.id}`} placeholder="Your answer" className="input-applyx h-8 w-40" style={{ height: 30 }} /><button className="underline" onClick={() => { const v = (document.getElementById(`ans-${a.id}`) as HTMLInputElement)?.value ?? ""; if (v) save(new Event("submit") as unknown as React.FormEvent, { ...a, answer: v }); }}>Approve</button></span>
                  : <button className="text-critical underline" onClick={() => remove(a.id)}>Delete</button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
