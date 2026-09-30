"use client";
import { useEffect, useState } from "react";

export default function MockSimple() {
  const [done, setDone] = useState<string | null>(null);
  const [dup, setDup] = useState(false);
  // document.title is read by the agent as the job title.
  useEffect(() => { document.title = "Software Engineer Intern — MockCorp"; }, []);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const email = String(fd.get("email") ?? "");
    const key = `mock-app:${email}:sde-intern`;
    if (localStorage.getItem(key)) {
      setDup(true);
      return;
    }
    const id = "MOCK-" + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem(key, id);
    setDone(id);
  }

  if (done) {
    return (
      <div className="max-w-xl space-y-2">
        <h1 className="text-xl font-bold">Application submitted — thank you for applying!</h1>
        <p>Confirmation! Your application has been received.</p>
        <p className="font-mono text-sm">Application ID: {done}</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1>Software Engineer Intern — MockCorp (Bangalore)</h1>
      <p className="text-sm text-neutral-500">Job description: build features with React and Node. Requirements: 0-1 years, DSA basics. Apply below.</p>
      {dup && <p role="alert" className="text-sm text-red-600">Error: duplicate application — you already applied with this email.</p>}
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <label className="text-sm">First Name<input name="firstName" required className="input-applyx mt-1 w-full" /></label>
        <label className="text-sm">Last Name<input name="lastName" required className="input-applyx mt-1 w-full" /></label>
        <label className="text-sm">Email<input name="email" type="email" required className="input-applyx mt-1 w-full" /></label>
        <label className="text-sm">Phone<input name="phone" className="input-applyx mt-1 w-full" /></label>
        <label className="text-sm">LinkedIn<input name="linkedin" className="input-applyx mt-1 w-full" /></label>
        <label className="text-sm">University
          <select name="university" className="input-applyx mt-1 w-full">
            <option value="">Select…</option><option>IIT Delhi</option><option>Other</option>
          </select>
        </label>
        <fieldset className="text-sm">Degree
          <label className="mr-3"><input type="radio" name="degree" value="B.Tech" /> B.Tech</label>
          <label><input type="radio" name="degree" value="M.Tech" /> M.Tech</label>
        </fieldset>
        <fieldset className="text-sm">Skills
          <label className="mr-3"><input type="checkbox" name="skills" value="React" /> React</label>
          <label><input type="checkbox" name="skills" value="Node" /> Node</label>
        </fieldset>
        <label className="col-span-2 text-sm">Cover note<textarea name="cover" rows={3} className="input-applyx mt-1 w-full" style={{ height: "auto" }} /></label>
        <label className="text-sm">Resume<input name="resume" type="file" accept="application/pdf" required className="mt-1 block" /></label>
        <label className="text-sm">Are you authorized to work in India?<input name="auth" required className="input-applyx mt-1 w-full" /></label>
        <label className="col-span-2 text-sm">Expected CTC (LPA)?<input name="ctc" required className="input-applyx mt-1 w-full" /></label>
        <button type="submit" className="btn-primary col-span-2">Submit application</button>
      </form>
    </div>
  );
}
