import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apply Agent — V1",
  description: "Free-first single-user autonomous job application agent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <a href="/" className="font-semibold">
                🤖 Apply Agent <span className="text-xs font-normal text-neutral-500">V1 · free-first</span>
              </a>
              <nav className="flex gap-4 text-sm">
                <a href="/dashboard">Dashboard</a>
                <a href="/profile">Profile</a>
                <a href="/resumes">Resumes</a>
                <a href="/answer-bank">Answers</a>
                <a href="/policies">Policies</a>
                <a href="/applications">Applications</a>
                <a href="/agent-runs">Runs</a>
                <a href="/settings">Settings</a>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
