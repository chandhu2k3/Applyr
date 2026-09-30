import { describe, expect, it } from "vitest";
import { analyzeJob, classifyRoleFamily, extractCompany } from "@/agents/job-analyzer";
import { matchCandidate } from "@/agents/candidate-matcher";
import { PolicySchema } from "@/lib/policy/engine";

const POLICY = PolicySchema.parse({});

describe("company extraction", () => {
  it("greenhouse path company", () => {
    expect(extractCompany("https://job-boards.greenhouse.io/yext/jobs/8239363", "Software Engineer", "")).toBe("Yext");
    expect(extractCompany("https://boards.greenhouse.io/razorpay/jobs/123", "Product Intern", "")).toBe("Razorpay");
  });
  it("lever path company", () => {
    expect(extractCompany("https://jobs.lever.co/stripe/abc-123", "Backend Engineer", "")).toBe("Stripe");
  });
  it("falls back to hostname", () => {
    expect(extractCompany("https://careers.acme.co/apply/1", "Join us", "")).toBe("acme");
  });
});

describe("real-profile matching (the Yext case)", () => {
  it("APPLY when skills overlap — no longer blocked on empty profile", () => {
    const job = analyzeJob({ title: "Software Engineer", description: "Build backend services with Node, React. Requirements: 0-2 years, DSA.", url: "https://job-boards.greenhouse.io/yext/jobs/8239363" });
    expect(job.roleFamily).toBe("SDE");
    const m = matchCandidate({ job, candidateSkills: ["React", "Node"], candidateExperienceYears: 1 }, POLICY, true);
    expect(m.decision).toBe("APPLY");
  });
  it("still BLOCKs when nothing overlaps", () => {
    const job = analyzeJob({ title: "Software Engineer", description: "Node React", url: "u" });
    const m = matchCandidate({ job, candidateSkills: [], candidateExperienceYears: 1 }, POLICY, true);
    expect(m.decision).toBe("BLOCK");
  });
  it("classifier ignores URL-looking titles gracefully", () => {
    expect(classifyRoleFamily("https://job-boards.greenhouse.io/yext/jobs/8239363", "software backend node react").family).toBe("SDE");
  });
});
