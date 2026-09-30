import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// Local-first browser driver. Runs on the user's machine; nothing cloud.
// Prefers accessible labels → placeholder/name → ids. Coordinates never.

export type SnapshotField = { tag: string; type: string; label: string; name: string; required: boolean };

export interface FormDriver {
  snapshotFields(): Promise<SnapshotField[]>;
  fillText(label: string, value: string, name?: string): Promise<void>;
  select(label: string, value: string, name?: string): Promise<void>;
  setChecked(label: string, checked: boolean, name?: string): Promise<void>;
  upload(label: string, filePath: string, name?: string): Promise<void>;
  clickSubmit(): Promise<void>;
  pageText(): Promise<string>;
  url(): string;
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class BrowserExecutor implements FormDriver {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private _page: Page | null = null;
  readonly actions: string[] = [];

  private req(): Page {
    if (!this._page) throw new Error("Browser not launched — call launch() first");
    return this._page;
  }

  async launch(headless = true): Promise<void> {
    this.browser = await chromium.launch({ headless });
    this.context = await this.browser.newContext();
    this._page = await this.context.newPage();
    this.actions.push("launch");
  }

  async navigate(target: string): Promise<void> {
    await this.req().goto(target, { waitUntil: "domcontentloaded", timeout: 30_000 });
    this.actions.push(`navigate ${target}`);
  }

  url(): string {
    return this._page?.url() ?? "";
  }

  async snapshotFields(): Promise<SnapshotField[]> {
    return this.req().evaluate(() => {
      const out: SnapshotField[] = [];
      document.querySelectorAll("input,textarea,select").forEach((el) => {
        const h = el as HTMLInputElement;
        const id = h.id ? `label[for="${h.id}"]` : null;
        const label =
          (id ? document.querySelector(id)?.textContent : "") ||
          h.getAttribute("aria-label") || h.getAttribute("placeholder") || h.getAttribute("name") || "";
        out.push({ tag: el.tagName.toLowerCase(), type: h.getAttribute("type") ?? "", label: label.trim().slice(0, 200), name: h.getAttribute("name") ?? "", required: h.required || h.getAttribute("aria-required") === "true" });
      });
      return out.slice(0, 200);
    });
  }

  private async resolve(label: string, name?: string): Promise<Locator> {
    const page = this.req();
    const re = new RegExp(esc(label), "i");
    const byLabel = page.getByLabel(re, { exact: false });
    if ((await byLabel.count()) > 0) return byLabel.first();
    if (name) {
      const byName = page.locator(`[name="${esc(name)}"]`);
      if ((await byName.count()) > 0) return byName.first();
    }
    const byPlaceholder = page.getByPlaceholder(re);
    if ((await byPlaceholder.count()) > 0) return byPlaceholder.first();
    throw new Error(`Unknown field (no accessible match): "${label}"`);
  }

  async fillText(label: string, value: string, name?: string): Promise<void> {
    await (await this.resolve(label, name)).fill(value);
    this.actions.push(`fill ${label}`);
  }

  async select(label: string, value: string, name?: string): Promise<void> {
    const loc = await this.resolve(label, name);
    if ((await loc.evaluate((el) => el.tagName.toLowerCase())) === "select") {
      await loc.selectOption({ label: value }).catch(() => loc.selectOption(value));
    } else {
      await loc.fill(value);
    }
    this.actions.push(`select ${label}=${value}`);
  }

  async setChecked(label: string, checked: boolean, name?: string): Promise<void> {
    await (await this.resolve(label, name)).setChecked(checked);
    this.actions.push(`check ${label}=${checked}`);
  }

  async upload(label: string, filePath: string, name?: string): Promise<void> {
    await (await this.resolve(label, name)).setInputFiles(filePath);
    this.actions.push(`upload ${label} <- ${filePath}`);
  }

  async clickSubmit(): Promise<void> {
    const page = this.req();
    const btn = page.getByRole("button", { name: /submit|apply|send|continue|next/i });
    if ((await btn.count()) > 0) {
      await Promise.all([page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {}), btn.first().click()]);
    } else {
      await page.locator('button[type="submit"],input[type="submit"]').first().click().catch(() => {
        throw new Error("No submit control found — BLOCKED");
      });
    }
    this.actions.push("submit-click");
  }

  async pageText(): Promise<string> {
    return (await this.req().evaluate(() => document.body.innerText)).slice(0, 20_000);
  }

  async pageTitle(): Promise<string> {
    return this.req().title();
  }

  async screenshot(name: string): Promise<string> {
    const dir = join(process.cwd(), "data", "evidence");
    await mkdir(dir, { recursive: true });
    const full = join(dir, `${Date.now()}_${name}.png`);
    await this.req().screenshot({ path: full });
    return full;
  }

  async saveTextEvidence(name: string, text: string): Promise<string> {
    const dir = join(process.cwd(), "data", "evidence");
    await mkdir(dir, { recursive: true });
    const full = join(dir, `${Date.now()}_${name}.txt`);
    await writeFile(full, text);
    void dirname;
    return full;
  }

  async close(): Promise<void> {
    await this.context?.close().catch(() => {});
    await this.browser?.close().catch(() => {});
    this._page = null;
  }
}
