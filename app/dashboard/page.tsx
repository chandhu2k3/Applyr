import { Badge } from "@/components/ui/card";
import { KillSwitch } from "@/components/dashboard/kill-switch";

const ROWS = [
  { co: "Google", role: "Product Manager Intern", platform: "Greenhouse", resume: "PM Resume — v3", status: "Verified" as const, tone: "verified", date: "28 Sep 2026 · 10:42 PM", evidence: "Ref: ABC12345" },
  { co: "Microsoft", role: "Software Engineer II", platform: "Workday", resume: "SDE Resume — v4", status: "Submitted" as const, tone: "submitted", date: "27 Sep 2026 · 04:15 PM", evidence: "Email Detected" },
  { co: "Razorpay", role: "Product Intern", platform: "Lever", resume: "PM Resume — v3", status: "Needs Attention" as const, tone: "attention", date: "27 Sep 2026 · 11:05 AM", evidence: "Subjective Q Block" },
  { co: "Stripe", role: "Backend Engineer", platform: "Ashby", resume: "SDE Resume — v4", status: "Verified" as const, tone: "verified", date: "26 Sep 2026 · 09:12 PM", evidence: "Ref: ST-99214" },
  { co: "Atlassian", role: "Tech PM", platform: "BambooHR", resume: "PM Resume — v3", status: "Submitted" as const, tone: "submitted", date: "26 Sep 2026 · 03:30 PM", evidence: "Ingestion Pending" },
];

const LOG = [
  ["22:42:01.12", "AGENT", "Hooked Greenhouse form target #app-root"],
  ["22:42:04.88", "MATCH", "Verified profile mapping (Score: 0.98)"],
  ["22:42:10.42", "DOM", "Autofilled 18 standard fields"],
  ["22:42:15.02", "HITL", "Prompted review for compensation expectations"],
  ["22:42:38.20", "VERIFY", "Submission confirmation received: ABC12345"],
] as const;

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      {/* Greeting + actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Good evening, Chandra</h1>
          <p className="mt-1 text-[13px] text-neutral-500">Autonomous application activity and agent verification telemetry across connected ATS endpoints.</p>
        </div>
        <div className="flex gap-2">
          <a href="/settings" className="btn-technical">Install Extension</a>
          <a href="/agent-runs" className="btn-primary">New Agent Run</a>
        </div>
      </div>

      {/* Trust banner */}
      <div className="panel flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Badge tone="verified">Autonomous Precision Active</Badge>
        <span className="font-mono text-[11px] text-neutral-500">100% HITL REVIEW · 0 GUESSES</span>
        <span className="font-mono text-[11px] text-neutral-500">SHA256: 4e91…bf10</span>
        <span className="font-mono text-[11px] text-verified">POLICY OK</span>
        <span className="ml-auto"><KillSwitch compact /></span>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Total Applications", "24", "+6 this week · Target 30"],
          ["Submitted", "18", "75% conversion"],
          ["Verified Submissions", "17", "94.4% verif. rate"],
          ["Needs Attention", "2", "Human blocked"],
        ].map(([t, v, s]) => (
          <div key={t} className="panel p-4">
            <div className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">{t}</div>
            <div className="metric-num mt-1 text-[32px] font-semibold leading-10 tracking-tight">{v}</div>
            <div className="mt-1 text-xs text-neutral-500">{s}</div>
          </div>
        ))}
      </div>

      {/* Applications table */}
      <div className="panel">
        <div className="panel-header flex items-center justify-between">
          <span>Recent Applications — live browser actions & verification records</span>
          <Badge tone="running">Autopilot: Synchronized</Badge>
        </div>
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-hairline font-mono text-[11px] uppercase tracking-wide text-neutral-400">
              <th className="px-4 py-2 font-medium">Company & Role</th>
              <th className="px-4 py-2 font-medium">Platform</th>
              <th className="px-4 py-2 font-medium">Resume Used</th>
              <th className="px-4 py-2 font-medium">Agent Status</th>
              <th className="px-4 py-2 font-medium">Applied Date</th>
              <th className="px-4 py-2 font-medium">Evidence Audit</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.co} className="border-b border-hairline last:border-0 hover:bg-canvas/60">
                <td className="px-4 py-2.5"><span className="font-semibold">{r.co}</span><br /><span className="text-neutral-500">{r.role}</span></td>
                <td className="px-4 py-2.5 font-mono text-[12px]">{r.platform}</td>
                <td className="px-4 py-2.5 text-neutral-600">{r.resume}</td>
                <td className="px-4 py-2.5"><Badge tone={r.tone}>{r.status}</Badge></td>
                <td className="metric-num px-4 py-2.5 text-neutral-600">{r.date}</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-neutral-500">{r.evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Health + live log */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="panel">
          <div className="panel-header">Agent Health & Policy — realtime engine telemetry</div>
          <div className="grid grid-cols-2 gap-3 p-4 text-[13px]">
            {[["Zero Hallucination Score", "100.0%"], ["Answer Bank Hit Rate", "88.4%"], ["CAPTCHA Encounters", "3 · 0 failed · paused"], ["Avg. Completion Time", "42s · optimal"]].map(([k, v]) => (
              <div key={k}><div className="text-neutral-500">{k}</div><div className="metric-num mt-0.5 text-lg font-semibold">{v}</div></div>
            ))}
          </div>
        </div>
        <div className="panel overflow-hidden">
          <div className="panel-header">Live Agent Event Log — buffer active</div>
          <div className="telemetry-log space-y-0.5 p-4">
            {LOG.map(([t, lvl, msg]) => (
              <div key={t} className="flex gap-3">
                <span className="metric-num shrink-0 text-neutral-400">{t}</span>
                <span className="w-14 shrink-0 font-medium text-cobalt">[{lvl}]</span>
                <span>{msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
