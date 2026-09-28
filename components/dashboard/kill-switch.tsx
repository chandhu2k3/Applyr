"use client";
import { useState } from "react";

export function KillSwitch({ compact = false }: { compact?: boolean }) {
  const [stopped, setStopped] = useState(false);
  return (
    <button
      onClick={() => setStopped((s) => !s)}
      className={`rounded-applyx font-semibold ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"} ${stopped ? "bg-verified text-white" : "bg-critical text-white"}`}
      title="Global kill switch — stops new application execution, preserves records"
    >
      {stopped ? "▶ RESUME APPLICATIONS" : "■ STOP ALL APPLICATIONS"}
    </button>
  );
}
