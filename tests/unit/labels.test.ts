import { describe, expect, it } from "vitest";
import { sanitizeLabel } from "@/lib/labels";

describe("sanitizeLabel (real ATS markers)", () => {
  it("strips trailing markers", () => {
    expect(sanitizeLabel("First Name⚡")).toBe("First Name");
    expect(sanitizeLabel("First Name*")).toBe("First Name");
    expect(sanitizeLabel("Email *")).toBe("Email");
    expect(sanitizeLabel("Phone!")).toBe("Phone");
  });
  it("strips parenthetical hints", () => {
    expect(sanitizeLabel("Email (required)")).toBe("Email");
    expect(sanitizeLabel("Portfolio (optional)")).toBe("Portfolio");
    expect(sanitizeLabel("Name [required]")).toBe("Name");
  });
  it("strips invisible characters", () => {
    expect(sanitizeLabel("First\u200B Name")).toBe("First Name");
    expect(sanitizeLabel("\uFEFFLocation")).toBe("Location");
  });
  it("leaves clean labels alone", () => {
    expect(sanitizeLabel("Are you authorized to work in India?")).toBe("Are you authorized to work in India?");
    expect(sanitizeLabel("")).toBe("");
  });
});
