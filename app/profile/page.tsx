"use client";
import { useState } from "react";

export default function ProfilePage() {
  const [saved, setSaved] = useState(false);
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Candidate Profile — single source of truth</h1>
      <p className="text-sm text-neutral-500">Trusted facts only. The agent may NEVER invent beyond this + resume + answer bank.</p>
      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={(e) => { e.preventDefault(); setSaved(true); localStorage.setItem("candidate-profile", JSON.stringify(Object.fromEntries(new FormData(e.target as HTMLFormElement)))); }}
      >
        {[["firstName","First name"],["lastName","Last name"],["email","Email"],["phone","Phone"],["city","City"],["linkedin","LinkedIn"],["github","GitHub"],["workAuthorization","Work authorization"],["sponsorship","Sponsorship"]].map(([n,l]) => (
          <label key={n} className="text-sm">{l}<input name={n} className="mt-1 w-full rounded border px-2 py-1" /></label>
        ))}
        <button className="col-span-2 rounded bg-black px-4 py-2 text-white">Save locally (Supabase wiring next)</button>
      </form>
      {saved && <p className="text-sm text-green-600">Saved to localStorage. Supabase persistence uses the same shape.</p>}
    </div>
  );
}
