import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { now, uid, type AnswerRecord, type ApplicationRecord, type ResumeRecord, type RunRecord, type SettingsRecord, type Store, type AppEvent, type RunEvent } from "./types";

// Single-user JSON store. Zero config, ₹0, survives restarts.
// Used when Supabase env is absent (local dev). Hosted deployments use Supabase.

type DB = {
  profile: Record<string, string>;
  resumes: ResumeRecord[];
  applications: ApplicationRecord[];
  runs: RunRecord[];
  answers: AnswerRecord[];
  policy: Record<string, unknown>;
  settings: SettingsRecord;
};

const DEFAULT_POLICY = {
  enabledRoleFamilies: ["PM", "SDE"],
  allowedEmploymentTypes: ["Internship", "Full-time"],
  maxExperienceYears: 2, allowedLocations: [], minConfidence: 0.7,
  maxPerDay: 25, maxPerHour: 5, maxPerCompanyPerDay: 2, killSwitch: false,
};

const SEED_ANSWERS: Array<Omit<AnswerRecord, "id" | "updatedAt">> = [
  { pattern: "authorized to work", answer: "", category: "WORK_AUTHORIZATION", approved: false },
  { pattern: "require sponsorship", answer: "", category: "SPONSORSHIP", approved: false },
  { pattern: "willing to relocate", answer: "", category: "PREFERENCE", approved: false },
];

function seed(): DB {
  return {
    profile: {},
    resumes: [],
    applications: [],
    runs: [],
    answers: SEED_ANSWERS.map((a) => ({ ...a, id: uid(), updatedAt: now() })),
    policy: DEFAULT_POLICY,
    settings: { killSwitch: false, retentionDays: 30 },
  };
}

export class FileStore implements Store {
  readonly kind = "file" as const;
  private cache: DB | null = null;

  constructor(private file = process.env.APPLY_DB_PATH ?? join(process.cwd(), "data", "db.json")) {}

  private async load(): Promise<DB> {
    if (this.cache) return this.cache;
    try {
      this.cache = { ...seed(), ...JSON.parse(await readFile(this.file, "utf8")) };
    } catch {
      this.cache = seed();
    }
    return this.cache!;
  }

  private async save(): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    await writeFile(tmp, JSON.stringify(this.cache, null, 1));
    await rename(tmp, this.file);
  }

  async getProfile() { return (await this.load()).profile; }
  async setProfile(p: Record<string, string>) { const db = await this.load(); db.profile = p; await this.save(); return p; }

  async listResumes() { return (await this.load()).resumes; }
  async createResume(r: Omit<ResumeRecord, "id" | "createdAt">) {
    const db = await this.load();
    const rec = { ...r, id: uid(), createdAt: now() };
    db.resumes.push(rec); await this.save(); return rec;
  }
  async updateResume(id: string, patch: Partial<ResumeRecord>) {
    const db = await this.load();
    const r = db.resumes.find((x) => x.id === id);
    if (!r) return null;
    Object.assign(r, patch); await this.save(); return r;
  }
  async removeResume(id: string) {
    const db = await this.load();
    const n = db.resumes.length;
    db.resumes = db.resumes.filter((x) => x.id !== id);
    await this.save(); return db.resumes.length < n;
  }

  async listApplications() { return (await this.load()).applications; }
  async getApplication(id: string) { return (await this.load()).applications.find((x) => x.id === id) ?? null; }
  async createApplication(a: Omit<ApplicationRecord, "id" | "events" | "createdAt" | "updatedAt">) {
    const db = await this.load();
    const rec = { ...a, id: uid(), events: [], createdAt: now(), updatedAt: now() };
    db.applications.unshift(rec); await this.save(); return rec;
  }
  async addAppEvent(id: string, e: AppEvent) {
    const db = await this.load();
    const a = db.applications.find((x) => x.id === id);
    if (a) { a.events.push(e); a.updatedAt = now(); await this.save(); }
  }
  async setAppStatus(id: string, status: string, verification = "") {
    const db = await this.load();
    const a = db.applications.find((x) => x.id === id);
    if (a) { a.status = status; a.verification = verification; a.updatedAt = now(); await this.save(); }
  }

  async listRuns() { return (await this.load()).runs; }
  async createRun(r: Omit<RunRecord, "id" | "events" | "createdAt" | "endedAt">) {
    const db = await this.load();
    const rec = { ...r, id: uid(), events: [], createdAt: now(), endedAt: null };
    db.runs.unshift(rec);
    db.runs = db.runs.slice(0, 200); // single-user cap
    await this.save(); return rec;
  }
  async addRunEvent(id: string, e: RunEvent) {
    const db = await this.load();
    const r = db.runs.find((x) => x.id === id);
    if (r) { r.events.push(e); await this.save(); }
  }
  async finishRun(id: string, status: string, stage: string) {
    const db = await this.load();
    const r = db.runs.find((x) => x.id === id);
    if (r) { r.status = status; r.stage = stage; r.endedAt = now(); await this.save(); }
  }

  async listAnswers() { return (await this.load()).answers; }
  async upsertAnswer(a: Omit<AnswerRecord, "id" | "updatedAt"> & { id?: string }) {
    const db = await this.load();
    if (a.id) {
      const ex = db.answers.find((x) => x.id === a.id);
      if (ex) { Object.assign(ex, { ...a, updatedAt: now() }); await this.save(); return ex; }
    }
    const rec = { ...a, id: uid(), updatedAt: now() };
    db.answers.push(rec); await this.save(); return rec;
  }
  async removeAnswer(id: string) {
    const db = await this.load();
    const n = db.answers.length;
    db.answers = db.answers.filter((x) => x.id !== id);
    await this.save(); return db.answers.length < n;
  }

  async getPolicy() { return (await this.load()).policy; }
  async setPolicy(p: Record<string, unknown>) { const db = await this.load(); db.policy = p; await this.save(); return p; }
  async getSettings() { return (await this.load()).settings; }
  async setSettings(s: Partial<SettingsRecord>) { const db = await this.load(); Object.assign(db.settings, s); await this.save(); return db.settings; }
}
