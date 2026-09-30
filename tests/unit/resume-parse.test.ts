import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { completeness, extractPdfText, mergeIntoProfile, parseResumeProfile } from "@/lib/resume/parse";

const SAMPLE = `
Arjun Sharma
arjun.sharma@gmail.com | +91 98765 43210 | linkedin.com/in/arjunsharma | github.com/arjunsharma
EDUCATION
IIT Delhi — B.Tech Computer Science, 2021 - 2025, CGPA 8.4
SKILLS
Python, React, Node.js, SQL, Docker, Git, Data Structures
EXPERIENCE
Software Engineer Intern, StartupXYZ (May 2024 - July 2024): built REST APIs with Node and React.
`;

describe("resume parser", () => {
  it("extracts contact + links + education", () => {
    const { profile, missing } = parseResumeProfile(SAMPLE);
    expect(profile.firstName).toBe("Arjun");
    expect(profile.lastName).toBe("Sharma");
    expect(profile.email).toBe("arjun.sharma@gmail.com");
    expect(profile.phone).toContain("98765");
    expect(profile.linkedin).toContain("linkedin.com/in/arjunsharma");
    expect(profile.github).toContain("github.com/arjunsharma");
    expect(profile.degree).toMatch(/B\.Tech/i);
    expect(profile.education).toMatch(/IIT Delhi/);
    expect(missing).toContain("city"); // never invent location
  });
  it("finds canonical skills", () => {
    const { profile } = parseResumeProfile(SAMPLE);
    for (const s of ["Python", "React", "Node", "SQL", "Docker", "Git", "DSA"]) {
      expect(profile.skills).toContain(s);
    }
  });
  it("reads experience from date ranges", () => {
    const { profile } = parseResumeProfile("Intern (2023 - 2024)\nJunior Dev (2024 - present)");
    expect(Number(profile.experienceYears)).toBeGreaterThanOrEqual(1);
  });
  it("merges without overwriting + unions skills", () => {
    const { merged, filled } = mergeIntoProfile(
      { firstName: "Keep", email: "keep@x.com", skills: "Go" },
      { ...parseResumeProfile(SAMPLE).profile }
    );
    expect(merged.firstName).toBe("Keep"); // user wins
    expect(merged.email).toBe("keep@x.com");
    expect(merged.phone).toContain("98765"); // empty filled
    expect(merged.skills).toMatch(/Go/);
    expect(merged.skills).toMatch(/React/);
    expect(filled).toContain("phone");
    expect(filled.some((f) => f.startsWith("skills"))).toBe(true);
  });
  it("completeness flags gaps", () => {
    expect(completeness({ firstName: "A" }).missing).toContain("email");
    expect(completeness({ firstName: "A", lastName: "B", email: "e", phone: "p", city: "c", skills: "s", experienceYears: "1" }).missing).toEqual([]);
  });
  it("extracts real PDF text", async () => {
    const buf = new Uint8Array(readFileSync("tests/fixtures/resume.pdf"));
    const text = await extractPdfText(buf);
    expect(text).toMatch(/Test Candidate Resume/);
  });
});
