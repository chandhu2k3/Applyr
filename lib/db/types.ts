// Shared record shapes. Same contract for file store (local dev) and Supabase (hosted).
export type ResumeRecord = {
  id: string; name: string; roleFamily: string; version: number;
  storageProvider: string; storageKey: string; mimeType: string; fileSize: number;
  active: boolean; isDefault: boolean; keywords: string[]; createdAt: string;
};

export type AppEvent = { t: string; type: string; meta?: Record<string, unknown> };

export type ApplicationRecord = {
  id: string;
  company: string; title: string; location: string; url: string; platform: string;
  resumeId: string; resumeName: string;
  status: string; verification: string; applicationId: string | null;
  answers: Record<string, string>;
  events: AppEvent[];
  createdAt: string; updatedAt: string;
};

export type RunEvent = { t: string; level: string; msg: string };

export type RunRecord = {
  id: string; status: string; stage: string;
  jobTitle: string; applicationId: string | null;
  events: RunEvent[]; aiCalls: number;
  createdAt: string; endedAt: string | null;
};

export type AnswerRecord = {
  id: string; pattern: string; answer: string; category: string; approved: boolean; updatedAt: string;
};

export type SettingsRecord = { killSwitch: boolean; retentionDays: number };

export interface Store {
  readonly kind: "file" | "supabase";
  getProfile(): Promise<Record<string, string>>;
  setProfile(p: Record<string, string>): Promise<Record<string, string>>;
  listResumes(): Promise<ResumeRecord[]>;
  createResume(r: Omit<ResumeRecord, "id" | "createdAt">): Promise<ResumeRecord>;
  updateResume(id: string, patch: Partial<ResumeRecord>): Promise<ResumeRecord | null>;
  removeResume(id: string): Promise<boolean>;
  listApplications(): Promise<ApplicationRecord[]>;
  getApplication(id: string): Promise<ApplicationRecord | null>;
  createApplication(a: Omit<ApplicationRecord, "id" | "events" | "createdAt" | "updatedAt">): Promise<ApplicationRecord>;
  addAppEvent(id: string, e: AppEvent): Promise<void>;
  setAppStatus(id: string, status: string, verification?: string): Promise<void>;
  listRuns(): Promise<RunRecord[]>;
  createRun(r: Omit<RunRecord, "id" | "events" | "createdAt" | "endedAt">): Promise<RunRecord>;
  addRunEvent(id: string, e: RunEvent): Promise<void>;
  finishRun(id: string, status: string, stage: string): Promise<void>;
  listAnswers(): Promise<AnswerRecord[]>;
  upsertAnswer(a: Omit<AnswerRecord, "id" | "updatedAt"> & { id?: string }): Promise<AnswerRecord>;
  removeAnswer(id: string): Promise<boolean>;
  getPolicy(): Promise<Record<string, unknown>>;
  setPolicy(p: Record<string, unknown>): Promise<Record<string, unknown>>;
  getSettings(): Promise<SettingsRecord>;
  setSettings(s: Partial<SettingsRecord>): Promise<SettingsRecord>;
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function now(): string {
  return new Date().toISOString();
}
