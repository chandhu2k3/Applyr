import { describe, expect, it } from "vitest";
import { FileStore } from "@/lib/db/file-store";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";

function fresh() {
  const dir = mkdtempSync(join(tmpdir(), "applyx-"));
  return new FileStore(join(dir, "db.json"));
}

describe("file store (real persistence)", () => {
  it("profile round-trips", async () => {
    const s = fresh();
    await s.setProfile({ firstName: "Ada", email: "a@b.c" });
    expect((await s.getProfile()).firstName).toBe("Ada");
  });
  it("resumes + answers + policy + settings", async () => {
    const s = fresh();
    const r = await s.createResume({ name: "SDE", roleFamily: "SDE", version: 1, storageProvider: "local", storageKey: "k", mimeType: "application/pdf", fileSize: 10, active: true, isDefault: true, keywords: [] });
    expect((await s.listResumes()).length).toBe(1);
    await s.updateResume(r.id, { active: false });
    expect((await s.listResumes())[0].active).toBe(false);
    const a = await s.upsertAnswer({ pattern: "sponsorship", answer: "No", category: "SPONSORSHIP", approved: true });
    expect((await s.listAnswers()).length).toBeGreaterThanOrEqual(4); // 3 seeds + 1
    await s.removeAnswer(a.id);
    await s.setSettings({ killSwitch: true });
    expect((await s.getSettings()).killSwitch).toBe(true);
    await s.setPolicy({ ...(await s.getPolicy()), maxPerDay: 5 });
    expect((await s.getPolicy() as { maxPerDay: number }).maxPerDay).toBe(5);
  });
  it("applications + runs lifecycle", async () => {
    const s = fresh();
    const app = await s.createApplication({ company: "X", title: "Y", location: "", url: "u", platform: "generic", resumeId: "r", resumeName: "SDE", status: "SUBMITTED", verification: "", applicationId: "ID-1", answers: { Email: "a@b.c" }, missingQuestions: [] });
    await s.addAppEvent(app.id, { t: new Date().toISOString(), type: "SUBMITTED" });
    await s.setAppStatus(app.id, "VERIFIED", "email");
    expect((await s.getApplication(app.id))?.status).toBe("VERIFIED");
    const run = await s.createRun({ status: "running", stage: "apply", jobTitle: "Y", applicationId: app.id, aiCalls: 0 });
    await s.addRunEvent(run.id, { t: new Date().toISOString(), level: "VERIFY", msg: "ok" });
    await s.finishRun(run.id, "done", "verify");
    const runs = await s.listRuns();
    expect(runs[0].status).toBe("done");
    expect(runs[0].events.length).toBe(1);
  });
  it("clearHistory wipes runs + applications, keeps profile", async () => {
    const s = fresh();
    await s.setProfile({ firstName: "A" });
    await s.createApplication({ company: "X", title: "Y", location: "", url: "u", platform: "g", resumeId: "", resumeName: "", status: "BLOCKED", verification: "", applicationId: null, answers: {}, missingQuestions: ["Q?"] });
    await s.createRun({ status: "blocked", stage: "policy", jobTitle: "Y", applicationId: null, aiCalls: 0 });
    await s.clearHistory();
    expect(await s.listApplications()).toEqual([]);
    expect(await s.listRuns()).toEqual([]);
    expect((await s.getProfile()).firstName).toBe("A");
  });
});
