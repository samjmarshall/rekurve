import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? 3000;
const baseURL = process.env.VERCEL_URL ?? `http://localhost:${PORT}`;
const isCI = process.env.CI === "true";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : 6,
  reporter: isCI
    ? [["list"], ["html", { open: "never" }]]
    : [["html", { open: "on-failure" }]],

  outputDir: "test-results/",

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    storageState: undefined,
    permissions: [],
    geolocation: undefined,

    // Bypass Vercel Deployment Protection for automated tests
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          "x-vercel-protection-bypass":
            process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
          "x-vercel-set-bypass-cookie": "true",
        }
      : {},
  },

  // In CI, test against the deployed URL — no local server needed
  webServer: isCI
    ? undefined
    : {
        command: `rm -rf .next/ && yarn build && yarn start`,
        url: `http://localhost:${PORT}`,
        timeout: 120_000,
        reuseExistingServer: true,
      },

  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
