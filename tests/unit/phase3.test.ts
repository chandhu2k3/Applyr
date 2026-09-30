import { describe, expect, it } from "vitest";
import { runApplication, type AppAgentInput } from "@/agents/application-agent";
import { verifySubmission } from "@/agents/verification-agent";
import { pickAdapter } from "@/browser/adapters/types";
import type { FormDriver } from "@/browser/executor";

function fakeDriver(afterText: string, record: string[]): FormDriver {
  return {
    snapshotFields: async () => [],
    fillText: async (l) => { record.push(`fill:${l}`); },
    select: async (l, v) => { record.push(`select:${l}=${v}`); },
    setChecked: async (l, c) => { record.push(`check:${l}=${c}`); },
    upload: async (l, f) => { record.push(`upload:${l}<-${f}`); },
    clickSubmit: async () => { record.push("submit"); },
    pageText: async () => afterText,
    url: () => "http://mock/submitted",
  };
}

const BASE: AppAgentInput = {
  url: "http://mock/apply", company: "MockCorp", title: "SDE Intern",
  pageFields: [
    { tag: "input", type: "text", label: "First Name", name: "fn", required: true },
    { tag: "input", type: "email", label: "Email", name: "em", required: true },
  ],
  profile: { firstName: "A", lastName: "B", email: "a@b.c" },
  bank: [], resumePath: "r.pdf", policyDecision: "APPLY", duplicate: false,
};

describe("application agent", () => {
  it("SUBMITTED with confirmation + ID", async () => {
    const rec: string[] = [];
    const r = await runApplication(BASE, fakeDriver("Thank you! Application submitted. Application ID: ABC-123", rec));
    expect(r.status).toBe("SUBMITTED");
    if (r.status === "SUBMITTED") expect(r.applicationId).toBe("ABC-123");
    expect(rec).toContain("upload:Resume<-r.pdf");
  });
  it("SUBMISSION_UNCERTAIN without evidence", async () => {
    const r = await runApplication(BASE, fakeDriver("Something happened.", []));
    expect(r.status).toBe("SUBMISSION_UNCERTAIN");
  });
  it("BLOCKED on unknown required", async () => {
    const r = await runApplication(
      { ...BASE, pageFields: [...BASE.pageFields, { tag: "input", type: "text", label: "Expected CTC", name: "ctc", required: true }] },
      fakeDriver("", [])
    );
    expect(r.status).toBe("BLOCKED");
    if (r.status === "BLOCKED") {
      expect(r.missingQuestions).toContain("Expected CTC");
      expect(r.missingProfile).toContain("salary"); // CTC maps to known type: profile gap + question
    }
  });
  it("distinguishes profile gaps from unknown questions", async () => {
    const r = await runApplication(
      {
        ...BASE,
        profile: { firstName: "A" }, // email missing from profile
        pageFields: [
          { tag: "input", type: "email", label: "Email", name: "em", required: true },
          { tag: "input", type: "text", label: "Spirit animal", name: "sa", required: true },
        ],
      },
      fakeDriver("", [])
    );
    expect(r.status).toBe("BLOCKED");
    if (r.status === "BLOCKED") {
      expect(r.missingProfile).toContain("email");
      expect(r.missingQuestions).toContain("Spirit animal");
    }
  });
});

describe("verification + adapters", () => {
  it("extracts ID, rejects weak text", () => {
    expect(verifySubmission("Confirmed! Reference: ST-99214. Thank you.", "a", "a").verified).toBe(true);
    expect(verifySubmission("Welcome to our careers page.", "a", "a").verified).toBe(false);
  });
  it("picks platform adapters", () => {
    expect(pickAdapter("https://boards.greenhouse.io/x").id).toBe("greenhouse");
    expect(pickAdapter("https://jobs.lever.co/x").id).toBe("lever");
    expect(pickAdapter("https://example.com/apply").id).toBe("generic");
  });
});
