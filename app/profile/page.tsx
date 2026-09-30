"use client";
import { useEffect, useState } from "react";

const FIELDS: Array<[string, string, string?]> = [
  ["firstName", "First name"], ["lastName", "Last name"], ["email", "Email"], ["phone", "Phone"],
  ["city", "City"], ["linkedin", "LinkedIn"], ["github", "GitHub"], ["portfolio", "Portfolio"],
  ["workAuthorization", "Work authorization"], ["sponsorship", "Sponsorship"],
  ["skills", "Skills (comma separated)", "React, Node, Python, Product, SQL"],
  ["experienceYears", "Experience (years)", "1"],
];

export default function ProfilePage() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const missing = ["firstName", "lastName", "email", "phone", "city", "skills", "experienceYears"].filter((k) => !form[k]);

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((d) => setForm(d.profile ?? {})).catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Saving…");
    const res = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile: form }) });
    setMsg(res.ok ? "Saved — this is the agent's source of truth." : "Save failed");
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Candidate Profile — single source of truth</h1>
      <p className="text-sm text-neutral-500">Trusted facts only. Upload a resume at <a href="/resumes" className="underline">Resumes</a> to auto-fill this — you only fill what parsing couldn&apos;t find.</p>
      {missing.length > 0
        ? <p className="rounded-applyx border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">Still needed for matching: <b>{missing.join(", ")}</b></p>
        : <p className="rounded-applyx border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Profile complete — the agent can match with full confidence.</p>}
      <form className="grid grid-cols-2 gap-3" onSubmit={save}>
        {FIELDS.map(([n, l, ph]) => (
          <label key={n} className="text-sm">{l}
            <input value={form[n] ?? ""} placeholder={ph ?? ""} onChange={(e) => setForm({ ...form, [n]: e.target.value })} className="input-applyx mt-1 w-full" />
          </label>
        ))}
        <button className="btn-primary col-span-2">Save profile</button>
      </form>
      {msg && <p className="text-sm text-green-600">{msg}</p>}
    </div>
  );
}
