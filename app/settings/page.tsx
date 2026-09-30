"use client";
import { useEffect, useState } from "react";
import { KillSwitch } from "@/components/dashboard/kill-switch";

export default function SettingsPage() {
  const [settings, setSettings] = useState({ killSwitch: false, retentionDays: 30 });
  const [persistence, setPersistence] = useState("file");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      if (d.settings) setSettings(d.settings);
      if (d.persistence) setPersistence(d.persistence);
    }).catch(() => {});
  }, []);

  async function save() {
    setMsg("Saving…");
    const res = await fetch("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(settings) });
    setMsg(res.ok ? "Settings saved." : "Save failed");
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Settings — kill switch · retention · AI</h1>
      <div className="panel space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Global kill switch</span>
          <KillSwitch compact />
        </div>
        <label className="block text-sm">Evidence retention (days)
          <input type="number" min={1} max={365} value={settings.retentionDays} onChange={(e) => setSettings({ ...settings, retentionDays: Number(e.target.value) })} className="input-applyx ml-3 w-24" />
        </label>
        <div className="font-mono text-[12px] text-neutral-500">
          persistence: {persistence} {persistence === "file" && "(local data/db.json — add Supabase keys for hosted persistence)"}
        </div>
        <button onClick={save} className="btn-primary">Save settings</button>
        {msg && <p className="text-sm text-neutral-600">{msg}</p>}
      </div>
      <ul className="list-disc pl-6 text-sm text-neutral-600">
        <li>AI provider: stub (₹0) → local → cloud fallback, configurable</li>
        <li>Browser automation always runs locally — never on the server</li>
      </ul>
    </div>
  );
}
