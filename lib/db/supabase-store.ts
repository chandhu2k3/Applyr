import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { now, type AnswerRecord, type AppEvent, type ApplicationRecord, type ResumeRecord, type RunEvent, type RunRecord, type SettingsRecord, type Store } from "./types";

// Hosted persistence for a single user. Same Store contract as FileStore.
// All rows share one sentinel user id; RLS stays off for personal use.

const USER = "00000000-0000-0000-0000-000000000000";

export class SupabaseStore implements Store {
  readonly kind = "supabase" as const;
  private db: SupabaseClient;

  constructor(url = process.env.NEXT_PUBLIC_SUPABASE_URL!, key = process.env.SUPABASE_SERVICE_ROLE_KEY!) {
    this.db = createClient(url, key);
  }

  async getProfile(): Promise<Record<string, string>> {
    const { data } = await this.db.from("candidate_profiles").select("*").eq("user_id", USER).limit(1).maybeSingle();
    if (!data) return {};
    return {
      firstName: data.first_name ?? "", lastName: data.last_name ?? "", email: data.email ?? "",
      phone: data.phone ?? "", city: data.city ?? "", linkedin: data.linkedin ?? "",
      github: data.github ?? "", portfolio: data.portfolio ?? "",
      workAuthorization: data.work_authorization ?? "", sponsorship: data.sponsorship ?? "",
    };
  }

  async setProfile(p: Record<string, string>): Promise<Record<string, string>> {
    await this.db.from("candidate_profiles").upsert({
      user_id: USER, first_name: p.firstName ?? "", last_name: p.lastName ?? "",
      email: p.email ?? "", phone: p.phone ?? "", city: p.city ?? "",
      linkedin: p.linkedin ?? "", github: p.github ?? "", portfolio: p.portfolio ?? "",
      work_authorization: p.workAuthorization ?? "", sponsorship: p.sponsorship ?? "",
      updated_at: now(),
    }, { onConflict: "user_id" });
    return p;
  }

  async listResumes(): Promise<ResumeRecord[]> {
    const { data } = await this.db.from("resumes").select("*").eq("user_id", USER).order("created_at", { ascending: false });
    return (data ?? []).map((r) => ({
      id: r.id, name: r.name, roleFamily: r.role_family, version: r.version,
      storageProvider: r.storage_provider, storageKey: r.storage_key, mimeType: r.mime_type,
      fileSize: r.file_size, active: r.active, isDefault: r.is_default,
      keywords: r.keywords ?? [], createdAt: r.created_at,
    }));
  }

  async createResume(r: Omit<ResumeRecord, "id" | "createdAt">): Promise<ResumeRecord> {
    const { data } = await this.db.from("resumes").insert({
      user_id: USER, name: r.name, role_family: r.roleFamily, version: r.version,
      storage_provider: r.storageProvider, storage_key: r.storageKey, mime_type: r.mimeType,
      file_size: r.fileSize, active: r.active, is_default: r.isDefault, keywords: r.keywords,
    }).select().single();
    if (!data) throw new Error("resume insert failed");
    return this.listResumes().then((all) => all.find((x) => x.id === data.id)!);
  }

  async updateResume(id: string, patch: Partial<ResumeRecord>): Promise<ResumeRecord | null> {
    const map: Record<string, unknown> = {};
    if (patch.name !== undefined) map.name = patch.name;
    if (patch.active !== undefined) map.active = patch.active;
    if (patch.isDefault !== undefined) map.is_default = patch.isDefault;
    if (patch.roleFamily !== undefined) map.role_family = patch.roleFamily;
    const { data } = await this.db.from("resumes").update(map).eq("id", id).select().maybeSingle();
    if (!data) return null;
    return this.listResumes().then((all) => all.find((x) => x.id === id) ?? null);
  }

  async removeResume(id: string): Promise<boolean> {
    const { error } = await this.db.from("resumes").delete().eq("id", id);
    return !error;
  }

  async listApplications(): Promise<ApplicationRecord[]> {
    const { data } = await this.db.from("applications").select("*").eq("user_id", USER).order("created_at", { ascending: false }).limit(200);
    const apps = data ?? [];
    const out: ApplicationRecord[] = [];
    for (const a of apps) {
      const { data: job } = await this.db.from("jobs").select("*").eq("id", a.job_id).maybeSingle();
      const { data: evts } = await this.db.from("application_events").select("*").eq("application_id", a.id).order("created_at");
      const resume = a.resume_id ? await this.db.from("resumes").select("name").eq("id", a.resume_id).maybeSingle() : null;
      out.push({
        id: a.id, company: job?.company ?? "", title: job?.title ?? "", location: job?.location ?? "",
        url: job?.url ?? "", platform: job?.platform ?? "generic",
        resumeId: a.resume_id ?? "", resumeName: (resume?.data as { name?: string } | null)?.name ?? "",
        status: a.status, verification: a.verification ?? "", applicationId: null,
        answers: {}, events: (evts ?? []).map((e) => ({ t: e.created_at, type: e.event_type, meta: e.metadata })),
        createdAt: a.created_at, updatedAt: a.updated_at,
      });
    }
    return out;
  }

  async getApplication(id: string): Promise<ApplicationRecord | null> {
    return this.listApplications().then((all) => all.find((a) => a.id === id) ?? null);
  }

  async createApplication(a: Omit<ApplicationRecord, "id" | "events" | "createdAt" | "updatedAt">): Promise<ApplicationRecord> {
    const { data: job } = await this.db.from("jobs").insert({
      user_id: USER, company: a.company, title: a.title, location: a.location, url: a.url, platform: a.platform,
    }).select().single();
    if (!job) throw new Error("job insert failed");
    const { data: app } = await this.db.from("applications").insert({
      user_id: USER, job_id: job.id, resume_id: a.resumeId || null, status: a.status, verification: a.verification,
    }).select().single();
    if (!app) throw new Error("application insert failed");
    return (await this.getApplication(app.id))!;
  }

  async addAppEvent(id: string, e: AppEvent): Promise<void> {
    await this.db.from("application_events").insert({ application_id: id, event_type: e.type, metadata: e.meta ?? {} });
  }

  async setAppStatus(id: string, status: string, verification = ""): Promise<void> {
    await this.db.from("applications").update({ status, verification, updated_at: now() }).eq("id", id);
  }

  async listRuns(): Promise<RunRecord[]> {
    const { data } = await this.db.from("agent_runs").select("*").eq("user_id", USER).order("created_at", { ascending: false }).limit(100);
    const out: RunRecord[] = [];
    for (const r of (data ?? [])) {
      const { data: evts } = await this.db.from("agent_events").select("*").eq("agent_run_id", r.id).order("created_at");
      out.push({
        id: r.id, status: r.status, stage: r.stage ?? "", jobTitle: "", applicationId: r.application_id,
        events: (evts ?? []).map((e) => ({ t: e.created_at, level: e.event_type, msg: String((e.metadata as { msg?: string })?.msg ?? e.event_type) })),
        aiCalls: 0, createdAt: r.created_at, endedAt: r.ended_at,
      });
    }
    return out;
  }

  async createRun(r: Omit<RunRecord, "id" | "events" | "createdAt" | "endedAt">): Promise<RunRecord> {
    const { data } = await this.db.from("agent_runs").insert({
      user_id: USER, status: r.status, stage: r.stage, application_id: r.applicationId,
    }).select().single();
    if (!data) throw new Error("run insert failed");
    return { ...r, id: data.id, events: [], createdAt: data.created_at, endedAt: null };
  }

  async addRunEvent(id: string, e: RunEvent): Promise<void> {
    await this.db.from("agent_events").insert({ agent_run_id: id, event_type: e.level, metadata: { msg: e.msg } });
  }

  async finishRun(id: string, status: string, stage: string): Promise<void> {
    await this.db.from("agent_runs").update({ status, stage, ended_at: now() }).eq("id", id);
  }

  async listAnswers(): Promise<AnswerRecord[]> {
    const { data } = await this.db.from("answer_bank").select("*").eq("user_id", USER).order("created_at");
    return (data ?? []).map((a) => ({ id: a.id, pattern: a.pattern, answer: a.answer, category: a.category, approved: a.approved, updatedAt: a.updated_at }));
  }

  async upsertAnswer(a: Omit<AnswerRecord, "id" | "updatedAt"> & { id?: string }): Promise<AnswerRecord> {
    if (a.id) {
      await this.db.from("answer_bank").update({ pattern: a.pattern, answer: a.answer, category: a.category, approved: a.approved, updated_at: now() }).eq("id", a.id);
      return { ...a, id: a.id, updatedAt: now() };
    }
    const { data } = await this.db.from("answer_bank").insert({ user_id: USER, pattern: a.pattern, answer: a.answer, category: a.category, approved: a.approved }).select().single();
    if (!data) throw new Error("answer insert failed");
    return { id: data.id, pattern: a.pattern, answer: a.answer, category: a.category, approved: a.approved, updatedAt: data.updated_at };
  }

  async removeAnswer(id: string): Promise<boolean> {
    const { error } = await this.db.from("answer_bank").delete().eq("id", id);
    return !error;
  }

  async getPolicy(): Promise<Record<string, unknown>> {
    const { data } = await this.db.from("application_policies").select("policy").eq("user_id", USER).maybeSingle();
    return (data?.policy as Record<string, unknown>) ?? {};
  }

  async setPolicy(p: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.db.from("application_policies").upsert({ user_id: USER, policy: p, updated_at: now() }, { onConflict: "user_id" });
    return p;
  }

  async getSettings(): Promise<SettingsRecord> {
    const { data } = await this.db.from("settings").select("*").eq("user_id", USER).maybeSingle();
    return { killSwitch: data?.kill_switch ?? false, retentionDays: data?.evidence_retention_days ?? 30 };
  }

  async setSettings(s: Partial<SettingsRecord>): Promise<SettingsRecord> {
    const cur = await this.getSettings();
    const next = { ...cur, ...s };
    await this.db.from("settings").upsert({ user_id: USER, kill_switch: next.killSwitch, evidence_retention_days: next.retentionDays, updated_at: now() }, { onConflict: "user_id" });
    return next;
  }
}
