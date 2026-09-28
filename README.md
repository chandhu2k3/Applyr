# Autonomous Job Application Agent — V1 (free-first, single-user)

Core flow: open a supported application page → **Apply with Agent** → analyze → fill from trusted data only → validate → submit → verify → record.

> BLOCK > GUESS · PAUSE > FABRICATE · VERIFY > ASSUME · LOCAL/FREE > PAID when reasonable

## V1 plan (this repo)
- [x] Phase 1 foundation: Next.js 14 + TS + Tailwind, 8 routes, Supabase schema (`supabase/migrations/0001_init.sql`), storage abstraction (local default, R2 later), policy/resume/validation/state-machine libs, MV3 extension skeleton
- [ ] Phase 2 intelligence: page/job analyzers, matcher, AI fallback w/ Zod, answer-bank matcher
- [ ] Phase 3 local browser agent: Playwright `BrowserExecutor` + greenhouse/lever/google-forms/generic adapters, extension↔local bridge
- [ ] Phase 4 mock ATS + tests (unit/integration/browser)
- [ ] Phase 5-6 hardening, runs dashboard, retention + AI-cost visibility

No job discovery in V1. No Redis/BullMQ. No PDFs in Postgres.

## Run (₹0 dev)
1. Copy `.env.example` → `.env` (Supabase keys optional for UI shell; profile saves locally until wired).
2. `npm install`, `npm run dev` → http://localhost:3000
3. `npm run typecheck`, `npm test`
4. Load `extension/` as unpacked Chrome extension for page analysis skeleton.

## Cost rules
Deterministic mappings first; AI only for complex semantics (`shouldUseAI`). Evidence retention default 30d. Files → local `./data/files` now, R2 later via `StorageAdapter`.
