import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "@/lib/policy/engine";
import { selectResumeDeterministic, mapFieldDeterministic } from "@/lib/resume/selector";
import { runValidationGate, isDuplicate } from "@/lib/validation/gate";
import { canTransition } from "@/lib/state-machine";

describe("policy engine", () => {
  it("blocks unsupported role family", () => {
    const r = evaluatePolicy(
      { enabledRoleFamilies: ["PM","SDE"], allowedEmploymentTypes: ["Internship","Full-time"], maxExperienceYears: 2, allowedLocations: [], minConfidence: 0.7, maxPerDay: 25, maxPerHour: 5, maxPerCompanyPerDay: 2, killSwitch: false },
      { roleFamily: "Design", employmentType: "Internship", experienceYears: 1, location: "Bangalore", confidence: 0.9, resumeAvailable: true }
    );
    expect(r.decision).toBe("BLOCK");
  });
});

describe("resume selector", () => {
  it("picks SDE for software text", () => {
    const s = selectResumeDeterministic(
      { title: "Software Engineer Intern", description: "React Node backend" },
      [{ id: "sde1", roleFamily: "SDE", active: true, isDefault: true, keywords: [] }]
    );
    expect(s?.roleFamily).toBe("SDE");
  });
  it("maps first name deterministically", () => {
    expect(mapFieldDeterministic("Applicant First Name")).toBe("firstName");
  });
});

describe("validation + duplicates + states", () => {
  it("blocks on unknown required", () => {
    const v = runValidationGate({ company: "X", title: "Y", resumeId: "r", resumeUploaded: true, requiredFields: [], unknownRequired: ["salary"], fabricated: false, policyDecision: "APPLY", duplicate: false, visibleErrors: [] });
    expect(v.ok).toBe(false);
  });
  it("detects duplicate URL", () => {
    expect(isDuplicate({ url: "u", company: "A", title: "SDE", location: "B" }, [{ url: "u", company: "A", title: "SDE", location: "B" }])).toBe(true);
  });
  it("rejects illegal transition", () => {
    expect(canTransition("DISCOVERED", "SUBMITTED")).toBe(false);
  });
});
