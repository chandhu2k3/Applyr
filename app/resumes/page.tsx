"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/card";

type Resume = { id: string; name: string; roleFamily: string; version: number; active: boolean; isDefault: boolean; fileSize: number; storageProvider: string };

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [msg, setMsg] = useState("");

  async function refresh() {
    const d = await fetch("/api/resumes").then((r) => r.json()).catch(() => ({ resumes: [] }));
    setResumes(d.resumes ?? []);
  }
  useEffect(() => { refresh(); }, []);

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("Uploading + parsing…");
    const res = await fetch("/api/resumes", { method: "POST", body: new FormData(e.target as HTMLFormElement) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      const p = d.parse;
      setMsg(`Uploaded ${d.resume.name} v${d.resume.version} · ${p?.skillsFound ?? 0} skills found${p?.filled?.length ? ` · profile filled: ${p.filled.join(", ")}` : ""}${p?.missing?.length ? ` · still missing: ${p.missing.join(", ")}` : ""}`);
    } else setMsg(`Failed: ${d.error ?? "error"}`);
    (e.target as HTMLFormElement).reset();
    refresh();
  }

  async function patch(id: string, body: object) {
    await fetch(`/api/resumes/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    refresh();
  }

  async function reparse(id: string) {
    setMsg("Parsing into profile…");
    const res = await fetch(`/api/resumes/${id}/parse`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Parsed · ${d.skillsFound} skills${d.filled?.length ? ` · filled: ${d.filled.join(", ")}` : " · profile already complete"}${d.missing?.length ? ` · missing: ${d.missing.join(", ")}` : ""}` : `Failed: ${d.error ?? "error"}`);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this resume record?")) return;
    await fetch(`/api/resumes/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Resume Library — PM / SDE families</h1>
      <p className="text-sm text-neutral-500">Uploading a resume auto-parses email, phone, links, skills, education and experience into your profile — only empty fields are filled, and anything missing is flagged for you.</p>
      <form onSubmit={upload} className="panel flex flex-wrap items-end gap-3 p-4">
        <label className="text-sm">Name<input name="name" required className="input-applyx mt-1 block" placeholder="SDE Resume" /></label>
        <label className="text-sm">Family<select name="roleFamily" className="input-applyx mt-1 block"><option>PM</option><option>SDE</option></select></label>
        <label className="text-sm">PDF<input name="file" type="file" accept="application/pdf" required className="mt-2 block" /></label>
        <button className="btn-primary">Upload</button>
        {msg && <span className="text-sm text-neutral-600">{msg}</span>}
      </form>
      <div className="panel">
        <div className="panel-header">Stored resumes ({resumes.length})</div>
        {resumes.length === 0 ? <p className="p-4 text-sm text-neutral-500">None yet — upload your PM and SDE resumes above.</p> :
        <table className="w-full text-left text-[13px]">
          <thead><tr className="border-b border-hairline font-mono text-[11px] uppercase text-neutral-400">
            <th className="px-4 py-2 font-medium">Name</th><th className="px-4 py-2 font-medium">Family</th><th className="px-4 py-2 font-medium">Ver</th><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2 font-medium">Actions</th>
          </tr></thead>
          <tbody>{resumes.map((r) => (
            <tr key={r.id} className="border-b border-hairline last:border-0">
              <td className="px-4 py-2 font-semibold">{r.name}</td>
              <td className="px-4 py-2 font-mono text-[12px]">{r.roleFamily}</td>
              <td className="px-4 py-2 metric-num">v{r.version}</td>
              <td className="px-4 py-2"><Badge tone={r.active ? "verified" : "draft"}>{r.isDefault ? "Default" : r.active ? "Active" : "Inactive"}</Badge></td>
              <td className="px-4 py-2">
                <span className="flex gap-2 text-[12px]">
                  <button className="underline" onClick={() => reparse(r.id)}>Parse → profile</button>
                  <button className="underline" onClick={() => patch(r.id, { active: !r.active })}>{r.active ? "Deactivate" : "Activate"}</button>
                  {!r.isDefault && <button className="underline" onClick={() => patch(r.id, { isDefault: true })}>Set default</button>}
                  <button className="text-critical underline" onClick={() => remove(r.id)}>Delete</button>
                </span>
              </td>
            </tr>
          ))}</tbody>
        </table>}
      </div>
    </div>
  );
}
