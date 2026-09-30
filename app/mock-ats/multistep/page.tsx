"use client";
import { useEffect, useState } from "react";

export default function MockMultistep() {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => { document.title = "Product Intern — MockCorp"; }, []);

  if (done) {
    return (
      <div className="max-w-xl space-y-2">
        <h1 className="text-xl font-bold">Application complete — thank you!</h1>
        <p>Your application has been submitted successfully.</p>
        <p className="font-mono text-sm">Reference: {done}</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1>Product Intern — MockCorp (Step {step} of 3)</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setDone("MOCK-MS-" + Math.floor(1000 + Math.random() * 9000));
        }}
      >
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">First Name<input name="firstName" required className="input-applyx mt-1 w-full" /></label>
            <label className="text-sm">Last Name<input name="lastName" required className="input-applyx mt-1 w-full" /></label>
            <label className="col-span-2 text-sm">Email<input name="email" type="email" required className="input-applyx mt-1 w-full" /></label>
            <button type="button" className="btn-primary col-span-2" onClick={() => setStep(2)}>Continue</button>
          </div>
        )}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">University<input name="university" required className="input-applyx mt-1 w-full" /></label>
            <label className="text-sm">Resume<input name="resume" type="file" accept="application/pdf" required className="mt-1 block" /></label>
            <div className="col-span-2 flex gap-2">
              <button type="button" className="btn-technical" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="btn-primary" onClick={() => setStep(3)}>Review</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm">Review your application and submit.</p>
            <div className="flex gap-2">
              <button type="button" className="btn-technical" onClick={() => setStep(2)}>Back</button>
              <button type="submit" className="btn-primary">Submit application</button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
