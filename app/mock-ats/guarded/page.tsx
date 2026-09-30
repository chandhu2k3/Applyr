"use client";

export default function MockGuarded() {
  return (
    <div className="max-w-xl space-y-4">
      <h1>Designer — MockCorp (Guarded)</h1>
      <p className="text-sm text-neutral-500">Please complete the CAPTCHA verification required below.</p>
      <div className="rounded border p-3 text-sm">
        <label><input type="checkbox" name="captcha" /> I&apos;m not a robot (reCAPTCHA simulation)</label>
      </div>
      <form className="grid gap-3" onSubmit={(e) => e.preventDefault()}>
        <label className="text-sm">First Name<input name="firstName" required className="input-applyx mt-1 w-full" /></label>
        <label className="text-sm">What is your spirit animal?<input name="spirit" required className="input-applyx mt-1 w-full" /></label>
        <button type="submit" className="btn-primary">Submit application</button>
      </form>
    </div>
  );
}
