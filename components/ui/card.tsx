import type { ReactNode } from "react";

export function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="panel p-4">
      <div className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">{title}</div>
      <div className="metric-num mt-1 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`btn-primary disabled:opacity-50 ${props.className ?? ""}`} />;
}

const DOT: Record<string, string> = {
  verified: "bg-verified",
  submitted: "bg-cobalt",
  attention: "bg-attention",
  blocked: "bg-attention",
  failed: "bg-critical",
  running: "bg-cobalt pulse-live",
  ready: "bg-cobalt",
  draft: "bg-neutral-300",
};

export function Badge({ tone = "draft", children }: { tone?: keyof typeof DOT | string; children: ReactNode }) {
  const dot = DOT[tone] ?? "bg-neutral-300";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white px-2 py-0.5 font-mono text-[11px] font-medium">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

export function PanelHeader({ children }: { children: ReactNode }) {
  return <div className="panel-header">{children}</div>;
}
