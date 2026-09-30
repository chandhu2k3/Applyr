import { describe, expect, it } from "vitest";
import { canonicalSkill, skillKey, skillOverlap, skillsInText, SKILL_VOCABULARY } from "@/lib/skills";
import { computeFit, FIT_WEIGHTS, SKIP_FLOOR } from "@/lib/decision/metrics";

describe("shared vocabulary", () => {
  it("is non-empty and unique by key", () => {
    const keys = SKILL_VOCABULARY.map(skillKey);
    expect(keys.length).toBeGreaterThan(50);
    expect(new Set(keys).size).toBeLessThanOrEqual(keys.length);
  });
  it("bridges profile phrasing and job-text phrasing", () => {
    expect(skillKey("REST APIs")).toBe(skillKey("api"));
    expect(skillKey("Node.js")).toBe(skillKey("node"));
    expect(skillKey("Next.js")).toBe(skillKey("nextjs"));
    expect(canonicalSkill("sql")).toBe("SQL");
  });
  it("finds terms in text and overlaps across phrasings", () => {
    expect(skillsInText("We build APIs with Node and React")).toContain(skillKey("api"));
    const overlap = skillOverlap("Full-Stack Engineer: web APIs, backend services", ["REST APIs", "Python", "Figma"]);
    expect(overlap).toContain("REST APIs");
    expect(overlap).not.toContain("Figma");
  });
});

describe("fit model math", () => {
  it("weights sum to 1.0", () => {
    expect(FIT_WEIGHTS.base + FIT_WEIGHTS.skillsMax + FIT_WEIGHTS.experience + FIT_WEIGHTS.family).toBeCloseTo(1.0);
  });
  it("is deterministic and fully explained", () => {
    const input = {
      title: "Software Engineer", description: "Node React APIs",
      roleFamily: "SDE", enabledFamilies: ["PM", "SDE"],
      candidateSkills: ["React", "Node"], candidateExperienceYears: 1, maxExperienceYears: 2,
    };
    const a = computeFit(input);
    const b = computeFit(input);
    expect(a.confidence).toBe(b.confidence);
    expect(a.metrics.reduce((s, m) => s + m.points, 0)).toBeCloseTo(a.confidence);
    expect(a.metrics.every((m) => m.points <= m.max && m.detail.length > 0)).toBe(true);
  });
  it("flags a skill-less profile as blind instead of silently scoring low", () => {
    const r = computeFit({
      title: "SDE", description: "React", roleFamily: "SDE", enabledFamilies: ["SDE"],
      candidateSkills: [], candidateExperienceYears: 1, maxExperienceYears: 2,
    });
    expect(r.blind).toBe(true);
    expect(r.reasons.join(" ")).toMatch(/blind/);
  });
  it("SKIP floor sits below a 0.7 default threshold", () => {
    expect(SKIP_FLOOR).toBeLessThan(0.7);
  });
});
