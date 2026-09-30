// Label hygiene for real ATS pages. Greenhouse/Lever decorate labels with
// required markers ("First Name*", "First Name⚡", "Email (required)") that
// break accessible-name matching if passed through verbatim.
export function sanitizeLabel(s: string): string {
  return (s ?? "")
    .replace(/[\u200B-\u200F\uFEFF]/g, "")
    .replace(/\s*[\(\[](required|optional|mandatory|\*)\s*[\)\]]\s*$/i, "")
    .replace(/[⚡*•·‼!‹›»«›❋✱✳✽✾✿]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
