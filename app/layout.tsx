import { JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

// Geist ships as the CSS-first stack (Next 14 has no Geist export);
// JetBrains Mono loads via next/font for telemetry text.
const jbmono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbmono" });

export const metadata: Metadata = {
  title: "ApplyX — Autonomous Job Agent",
  description: "Free-first single-user apply-with-agent command center",
};

const NAV = [
  ["Dashboard", "/dashboard"],
  ["Applications", "/applications"],
  ["Resumes", "/resumes"],
  ["Candidate Profile", "/profile"],
  ["Answer Bank", "/answer-bank"],
  ["Policies", "/policies"],
  ["Agent Runs", "/agent-runs"],
  ["Settings", "/settings"],
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jbmono.variable} font-sans`}>
        <div className="flex min-h-screen">
          {/* 240px utility rail */}
          <aside className="flex w-60 shrink-0 flex-col border-r border-hairline bg-white">
            <a href="/" className="flex items-center gap-2 border-b border-hairline px-4 py-3.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-applyx bg-obsidian text-sm font-bold text-white">A</span>
              <span className="text-[15px] font-semibold tracking-tight">ApplyX <span className="font-mono text-[10px] font-medium text-neutral-400">AGENT</span></span>
            </a>
            <nav className="flex-1 space-y-0.5 p-3">
              {NAV.map(([label, href]) => (
                <a key={href} href={href} className="block rounded-applyx px-3 py-1.5 text-[13px] text-neutral-700 hover:bg-canvas hover:text-ink">
                  {label}
                </a>
              ))}
            </nav>
            <div className="border-t border-hairline p-3">
              <a href="/settings" className="btn-technical block text-center">Open Chrome Side Panel</a>
              <p className="mt-2 text-center font-mono text-[10px] text-neutral-400">SINGLE-USER · ₹0 STACK</p>
            </div>
          </aside>
          {/* Main plane */}
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between border-b border-hairline bg-white px-6 py-2.5">
              <span className="font-mono text-[11px] text-neutral-500">LIVE SESSION TELEMETRY <span className="text-neutral-300">/</span> SYS_ID: 0x9AF2E4</span>
              <span className="flex items-center gap-2 rounded-full border border-hairline px-2.5 py-1 font-mono text-[11px]">
                <span className="pulse-live inline-block h-1.5 w-1.5 rounded-full bg-cobalt" />
                Agent Ready
              </span>
            </header>
            <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
