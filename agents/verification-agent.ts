import { VerificationSchema, type Verification } from "@/lib/ai/schemas";

// VerificationAgent — proof, not assumption. Only strong evidence → verified.
const ID_RE = /(application id|reference|confirmation)\s*[:#]?\s*([\w-]{4,32})/i;
const STRONG = [/application (has been )?(submitted|received|completed)/i, /thank you for applying/i, /your response has been recorded/i];
const SOFT = [/confirm\w*/i, /thank you/i, /success/i];

export function verifySubmission(afterText: string, urlBefore: string, urlAfter: string): Verification {
  const evidence: string[] = [];
  for (const re of [...STRONG, ...SOFT]) {
    const m = afterText.match(re);
    if (m && !evidence.includes(m[0])) evidence.push(m[0].slice(0, 120));
  }
  const idMatch = afterText.match(ID_RE);
  if (idMatch) evidence.push(idMatch[0].slice(0, 120));
  const urlChanged = urlBefore !== urlAfter && /confirm|success|thank|complete/i.test(urlAfter);
  if (urlChanged) evidence.push(`url:${urlAfter.slice(0, 120)}`);
  // Proof rule: an application/reference ID plus a success signal, or an
  // explicit submitted/received/recorded statement, or a confirmation URL.
  const hardProof = /submitted|received|recorded/i.test(evidence.join(" "));
  const verified = Boolean((idMatch && evidence.length >= 2) || hardProof || urlChanged);
  return VerificationSchema.parse({
    verified,
    evidence,
    applicationId: idMatch ? idMatch[2] : null,
  });
}
