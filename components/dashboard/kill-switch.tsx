"use client";
import { useEffect, useState } from "react";

export function KillSwitch({ compact = false }: { compact?: boolean }) {
  const [stopped, setStopped] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      setStopped(Boolean(d.settings?.killSwitch));
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  async function toggle() {
    const next = !stopped;
    setStopped(next);
    await fetch("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ killSwitch: next }) }).catch(() => {});
  }

  return (
    <button
      onClick={toggle}
      disabled={!loaded}
      className={`rounded-applyx font-semibold ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"} ${stopped ? "bg-verified text-white" : "bg-critical text-white"} disabled:opacity-50`}
      title="Global kill switch — persisted. Stops new applications, preserves records."
    >
      {stopped ? "▶ RESUME APPLICATIONS" : "■ STOP ALL APPLICATIONS"}
    </button>
  );
}
