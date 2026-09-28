"use client";
import { useState } from "react";

export function KillSwitch() {
  const [stopped, setStopped] = useState(false);
  return (
    <button
      onClick={() => setStopped((s) => !s)}
      className={`rounded px-4 py-2 text-sm font-semibold ${stopped ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
      title="Global kill switch — stops new application execution"
    >
      {stopped ? "▶ Resume applications" : "■ STOP ALL APPLICATIONS"}
    </button>
  );
}
