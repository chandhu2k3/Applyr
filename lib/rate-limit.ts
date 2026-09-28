// §48 — single-user rate limiter. Pure + testable; no Redis in V1.
export type RateConfig = {
  maxPerDay: number;
  maxPerHour: number;
  maxPerCompanyPerDay: number;
  minDelaySecs: number;
};

export type Attempt = { at: number; company: string };

export function checkRateLimit(attempts: Attempt[], now: number, company: string, cfg: RateConfig): { allowed: boolean; reason?: string } {
  const day = attempts.filter((a) => now - a.at < 86_400_000);
  if (day.length >= cfg.maxPerDay) return { allowed: false, reason: `Daily limit reached (${cfg.maxPerDay})` };
  const hour = day.filter((a) => now - a.at < 3_600_000);
  if (hour.length >= cfg.maxPerHour) return { allowed: false, reason: `Hourly limit reached (${cfg.maxPerHour})` };
  const co = day.filter((a) => a.company.toLowerCase() === company.toLowerCase());
  if (co.length >= cfg.maxPerCompanyPerDay) return { allowed: false, reason: `Company daily limit reached (${company})` };
  const last = attempts.length > 0 ? Math.max(...attempts.map((a) => a.at)) : 0;
  if (now - last < cfg.minDelaySecs * 1000) return { allowed: false, reason: `Wait ${cfg.minDelaySecs}s between applications` };
  return { allowed: true };
}
