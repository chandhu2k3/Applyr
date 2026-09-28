export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">One profile. Multiple tracks. Zero repetitive work.</h1>
      <p className="text-neutral-600">
        V1 core flow: open a supported application page → click <b>Apply with Agent</b> → agent
        analyzes, fills with trusted data only, validates, submits, verifies, records.
      </p>
      <div className="flex gap-3">
        <a href="/dashboard" className="rounded bg-black px-4 py-2 text-white">Open dashboard</a>
        <a href="/profile" className="rounded border px-4 py-2">Set up profile</a>
      </div>
      <ul className="list-disc pl-6 text-sm text-neutral-700">
        <li>BLOCK &gt; GUESS · PAUSE &gt; FABRICATE · VERIFY &gt; ASSUME</li>
        <li>Free-first: Supabase Free + local Playwright, no Redis/BullMQ in V1</li>
        <li>PDFs live in object storage (R2/local), never in Postgres</li>
      </ul>
    </div>
  );
}
