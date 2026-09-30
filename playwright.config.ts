import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  retries: 0,
  reporter: "line",
  use: { baseURL: "http://localhost:3000", ...devices["Desktop Chrome"] },
  webServer: { command: "npm run dev", port: 3000, reuseExistingServer: true, timeout: 120_000 },
});
