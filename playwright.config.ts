import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseURL = "http://127.0.0.1:4173/streak-jar/";

// Share one temporary directory with the worker; CI supplies its runner-temp path.
const outputDir = (process.env.STREAK_JAR_E2E_OUTPUT_DIR ??= mkdtempSync(
  join(tmpdir(), "streak-jar-e2e-"),
));

export default defineConfig({
  testDir: "./e2e",
  testMatch: "*.e2e.ts",
  workers: 1,
  retries: 0,
  globalTimeout: 100_000,
  outputDir,
  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    timezoneId: "Europe/Istanbul",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node scripts/serve-e2e.mjs",
    url: baseURL,
    reuseExistingServer: false,
  },
});
