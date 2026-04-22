import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.VERCEL_URL ?? "http://localhost:3000";
const isCI = process.env.CI === "true";

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/utils/global-teardown.ts",
  timeout: 45_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // 6 workers × 3 viewport projects overwhelms the local dev server (page.goto
  // timeouts under load). 4 keeps parallelism while leaving headroom.
  workers: isCI ? 1 : 4,
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
        command: "rm -rf .next/ && yarn db:migrate && yarn preview",
        url: baseURL,
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
      // HubSpot-mutating tests run on desktop only — they aren't viewport-specific
      // and parallel HubSpot API load across 3 projects causes timeouts and DB cleanup races.
      testIgnore: ["**/hubspot-sync.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "mobile",
      testIgnore: ["**/hubspot-sync.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
