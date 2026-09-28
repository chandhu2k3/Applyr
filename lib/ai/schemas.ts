import { z } from "zod";

// §45 — every AI call returns validated JSON.
export const JobAnalysisSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().default(""),
  employmentType: z.string().default(""),
  seniority: z.string().default(""),
  roleFamily: z.enum(["PM", "SDE", "Data", "Design", "Marketing", "Other"]),
  description: z.string().default(""),
  requirements: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  applicationPlatform: z.string().default("generic"),
  confidence: z.number().min(0).max(1),
});
export type JobAnalysis = z.infer<typeof JobAnalysisSchema>;

export const FieldMappingSchema = z.object({
  fieldId: z.string(),
  semanticType: z.string(),
  candidateField: z.string().nullable(),
  trusted: z.boolean(), // false = unknown question → BLOCK
});
export type FieldMapping = z.infer<typeof FieldMappingSchema>;

export const VerificationSchema = z.object({
  verified: z.boolean(),
  evidence: z.array(z.string()),
  applicationId: z.string().nullable().default(null),
});
export type Verification = z.infer<typeof VerificationSchema>;

export const CandidateProfileSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string().default(""),
  city: z.string().default(""),
  linkedin: z.string().default(""),
  github: z.string().default(""),
  workAuthorization: z.string().default(""),
  sponsorship: z.string().default(""),
});
export type CandidateProfile = z.infer<typeof CandidateProfileSchema>;
