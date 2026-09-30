export default function MockATSIndex() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Mock ATS — local test target</h1>
      <p className="text-sm text-neutral-500">Safe pages for the agent. No real data leaves your machine.</p>
      <ul className="list-disc space-y-1 pl-6 text-sm">
        <li><a className="underline" href="/mock-ats/simple">Simple application</a> — text, select, radio, checkbox, file, known + unknown questions</li>
        <li><a className="underline" href="/mock-ats/multistep">Multi-step application</a> — 2 steps + review + submit</li>
        <li><a className="underline" href="/mock-ats/guarded">Guarded application</a> — CAPTCHA simulation + unknown required (agent must BLOCK)</li>
      </ul>
    </div>
  );
}
