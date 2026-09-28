import { describe, expect, it } from "vitest";
import { analyzePage, detectPlatform } from "@/agents/page-analyzer";
import { analyzeJob, classifyRoleFamily, classifySeniority } from "@/agents/job-analyzer";
import { matchCandidate } from "@/agents/candidate-matcher";
import { matchAnswer, answerFromProfile } from "@/agents/answer-matcher";
import { checkRateLimit } from "@/lib/rate-limit";
import { PolicySchema } from "@/lib/policy/engine";

const POLICY = PolicySchema.parse({});

describe("page analyzer", () => {
  it("detects greenhouse + job signals", () => {
    const a = analyzePage({
      url: "https://boards.greenhouse.io/razorpay/jobs/123",
      title: "Product Intern",
      bodyText: "Apply now. Job description. Responsibilities. Requirements.",
      fields: [{ tag: "input", type: "text", label: "First Name", name: "fname", required: true }],
    });
    expect(a.platform).toBe("greenhouse");
    expect(a.isJobPage).toBe(true);
    expect(a.fields[0].semanticType).toBe("firstName");
  });
  it("pauses on captcha", () => {
    const a = analyzePage({ url: "https://x.com/apply", title: "Apply", bodyText: "please complete the captcha", fields: [] });
    expect(a.securityBlock).toBe("CAPTCHA");
  });
  it("lever + google forms detection", () => {
    expect(detectPlatform("https://jobs.lever.co/stripe/abc")).toBe("lever");
    expect(detectPlatform("https://docs.google.com/forms/d/e/x/viewform")).toBe("google-forms");
  });
});

describe("job analyzer", () => {
  it("classifies PM vs SDE", () => {
    expect(classifyRoleFamily("Product Intern", "roadmap prd user stories").family).toBe("PM");
    expect(classifyRoleFamily("Backend Engineer", "node react dsa algorithms").family).toBe("SDE");
  });
  it("seniority + full job", () => {
    expect(classifySeniority("Software Engineer Intern", "")).toBe("Internship");
    const j = analyzeJob({ title: "SDE Intern", description: "react node", url: "u" });
    expect(j.roleFamily).toBe("SDE");
    expect(j.employmentType).toBe("Internship");
  });
});

describe("matcher + answers + rate limit", () => {
  it("APPLY for supported SDE intern", () => {
    const job = analyzeJob({ title: "Software Engineer Intern", description: "react node python", url: "u" });
    const m = matchCandidate({ job, candidateSkills: ["react", "node"], candidateExperienceYears: 1 }, POLICY, true);
    expect(m.decision).toBe("APPLY");
  });
  it("BLOCK for senior unsupported", () => {
    const job = analyzeJob({ title: "Senior Designer", description: "figma", url: "u" });
    const m = matchCandidate({ job, candidateSkills: ["figma"], candidateExperienceYears: 5 }, POLICY, true);
    expect(m.decision).toBe("BLOCK");
  });
  it("answer bank hit then block", () => {
    const bank = [{ pattern: "work authorization", answer: "Authorized", category: "WORK_AUTHORIZATION" as const, approved: true }];
    expect(matchAnswer("Are you authorized to work?", bank).kind).toBe("ANSWERED");
    expect(matchAnswer("Expected salary?", bank).kind).toBe("BLOCKED");
    expect(answerFromProfile("email", { email: "a@b.c" }).kind).toBe("ANSWERED");
  });
  it("rate limits daily + company", () => {
    const cfg = { maxPerDay: 1, maxPerHour: 5, maxPerCompanyPerDay: 1, minDelaySecs: 0 };
    expect(checkRateLimit([{ at: 1000, company: "X" }], 2000, "Y", cfg).allowed).toBe(false);
    expect(checkRateLimit([{ at: 1000, company: "X" }], 2000, "X", { ...cfg, maxPerDay: 5 }).allowed).toBe(false);
  });
});
