// §8/§46 AI provider abstraction — deterministic first, cloud only when needed.
export type AIRole = "job-analysis" | "field-mapping" | "resume-selection" | "question-answering";

export interface AIProvider {
  readonly name: string;
  completeJSON<T>(role: AIRole, prompt: string, schemaHint: string): Promise<T>;
}

export class StubAIProvider implements AIProvider {
  readonly name = "stub";
  async completeJSON<T>(): Promise<T> {
    throw new Error("StubAIProvider: no cloud call in free-first dev. Wire a provider to use AI fallback.");
  }
}

// Factory reads env; defaults to stub so `npm run dev` costs ₹0.
export function getAIProvider(): AIProvider {
  // Future: if (process.env.OPENAI_API_KEY) return new OpenAIProvider(...)
  return new StubAIProvider();
}

// Cost guard: caller must justify AI use.
export function shouldUseAI(deterministicFailed: boolean, taskComplexity: "low" | "high"): boolean {
  if (!deterministicFailed) return false; // deterministic rules first
  return taskComplexity === "high"; // only complex semantics reach the model
}
