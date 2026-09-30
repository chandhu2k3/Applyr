import { test, expect } from "@playwright/test";
import { runApplication } from "@/agents/application-agent";
import { analyzePage } from "@/agents/page-analyzer";
import type { FormDriver } from "@/browser/executor";

// Thin driver that forwards agent calls to the Playwright test page.
function pageDriver(pageText: () => Promise<string>, impl: Partial<FormDriver> & { page: import("@playwright/test").Page }): FormDriver {
  const pg = impl.page;
  return {
    snapshotFields: async () => [],
    fillText: async (label, value) => { await pg.getByLabel(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).fill(value); },
    select: async (label, value) => { await pg.getByLabel(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).selectOption(value).catch(() => pg.getByLabel(new RegExp(label, "i")).fill(value)); },
    setChecked: async (label, checked) => { await pg.getByLabel(new RegExp(label, "i")).setChecked(checked); },
    upload: async (label, file) => { await pg.locator('input[name="resume"]').setInputFiles(file); },
    clickSubmit: async () => { await Promise.all([pg.waitForLoadState("domcontentloaded").catch(() => {}), pg.getByRole("button", { name: /submit application/i }).click()]); },
    pageText,
    url: () => pg.url(),
  };
}

const PROFILE = { firstName: "Test", lastName: "Candidate", email: "agent-e2e@example.com", phone: "9999999999", university: "IIT Delhi" };
const BANK = [{ pattern: "authorized to work", answer: "Yes", category: "WORK_AUTHORIZATION" as const, approved: true }];

test("mock simple: agent BLOCKS on unknown required CTC (never guesses)", async ({ page }) => {
  await page.goto("/mock-ats/simple");
  const fields = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input,textarea,select")).map((el) => {
      const h = el as HTMLInputElement;
      return { tag: el.tagName.toLowerCase(), type: h.getAttribute("type") ?? "", label: (el.closest("label")?.innerText?.split("\n")[0] ?? h.getAttribute("name") ?? "").trim().slice(0, 80), name: h.getAttribute("name") ?? "", required: h.required };
    })
  );
  const res = await runApplication(
    { url: page.url(), company: "MockCorp", title: "SDE Intern", pageFields: fields, profile: PROFILE, bank: BANK, resumePath: "tests/fixtures/resume.pdf", policyDecision: "APPLY", duplicate: false },
    pageDriver(() => page.evaluate(() => document.body.innerText), { page })
  );
  expect(res.status).toBe("BLOCKED");
  if (res.status === "BLOCKED") expect(res.reason).toMatch(/CTC|Unknown required/i);
});

test("mock simple: manual full fill submits and verifies; repeat is duplicate", async ({ page }) => {
  await page.goto("/mock-ats/simple");
  await page.getByLabel(/first name/i).fill("Test");
  await page.getByLabel(/last name/i).fill("Candidate");
  await page.getByLabel(/email/i).fill("dup-e2e@example.com");
  await page.getByLabel(/authorized to work/i).fill("Yes");
  await page.getByLabel(/expected ctc/i).fill("12");
  await page.locator('input[name="resume"]').setInputFiles("tests/fixtures/resume.pdf");
  await page.getByRole("button", { name: /submit application/i }).click();
  await expect(page.getByText(/application id: mock-/i)).toBeVisible();
  await page.goto("/mock-ats/simple");
  await page.getByLabel(/first name/i).fill("Test");
  await page.getByLabel(/last name/i).fill("Candidate");
  await page.getByLabel(/email/i).fill("dup-e2e@example.com");
  await page.getByLabel(/authorized to work/i).fill("Yes");
  await page.getByLabel(/expected ctc/i).fill("12");
  await page.locator('input[name="resume"]').setInputFiles("tests/fixtures/resume.pdf");
  await page.getByRole("button", { name: /submit application/i }).click();
  await expect(page.getByText(/duplicate application/i)).toBeVisible();
});

test("mock guarded: captcha halts the agent", async ({ page }) => {
  await page.goto("/mock-ats/guarded");
  const text = await page.evaluate(() => document.body.innerText);
  const analysis = analyzePage({ url: page.url(), title: "Designer", bodyText: text, fields: [] });
  expect(analysis.securityBlock).toBe("CAPTCHA");
  const res = await runApplication(
    { url: page.url(), company: "MockCorp", title: "Designer", pageFields: [], profile: PROFILE, bank: BANK, resumePath: "tests/fixtures/resume.pdf", policyDecision: "APPLY", duplicate: false },
    { snapshotFields: async () => [], fillText: async () => {}, select: async () => {}, setChecked: async () => {}, upload: async () => {}, clickSubmit: async () => {}, pageText: async () => text, url: () => page.url() }
  );
  expect(res.status).toBe("BLOCKED");
});
