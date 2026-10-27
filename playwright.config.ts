import { defineConfig } from "@playwright/test";

const baseURL = process.env.QA_BASE_URL ?? "https://qa.easerva.com";

export default defineConfig({
  testDir: "./e2e",
  timeout: 3 * 60 * 1000,
  expect: {
    timeout: 30_000,
  },
  fullyParallel: false,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    httpCredentials:
      process.env.QA_BASIC_AUTH_USER && process.env.QA_BASIC_AUTH_PASS
        ? {
            username: process.env.QA_BASIC_AUTH_USER,
            password: process.env.QA_BASIC_AUTH_PASS,
          }
        : undefined,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
    },
  ],
});
