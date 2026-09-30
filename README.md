# Autonomous Job Application Agent — V1 (free-first, single-user)

Core flow: open a supported application page → **Apply with Agent** → analyze → fill from trusted data only → validate → submit → verify → record.

> BLOCK > GUESS · PAUSE > FABRICATE · VERIFY > ASSUME · LOCAL/FREE > PAID when reasonable

## V1 plan (this repo)
- [x] Phase 1 foundation: Next.js 14 + TS + Tailwind, routes, Supabase schema, storage abstraction, policy/resume/validation/state-machine, MV3 extension
- [x] Phase 2 intelligence: page/job analyzers, matcher, AI fallback w/ Zod, answer-bank matcher, `/api/analyze`
- [x] Phase 3 browser agent: local Playwright `BrowserExecutor` + greenhouse/lever/g-forms/generic adapters, app + verification agents, mock ATS, `apply:local` CLI, browser tests
- [x] Phase 4 real product: file/Supabase store, real CRUD APIs (profile/resumes/applications/runs/answers/policy/settings), all pages on live data, persisted kill switch, run logging

No job discovery in V1. No Redis/BullMQ. No PDFs in Postgres.

## Run (₹0 dev)
1. Copy `.env.example` → `.env` (Supabase keys optional for UI shell; profile saves locally until wired).
2. `npm install`, `npm run dev` → http://localhost:3000
3. `npm run typecheck`, `npm test`
4. Load `extension/` as unpacked Chrome extension for page analysis skeleton.

## Cost rules
Deterministic mappings first; AI only for complex semantics (`shouldUseAI`). Evidence retention default 30d. Files → local `./data/files` now, R2 later via `StorageAdapter`.
