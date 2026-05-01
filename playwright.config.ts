import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.VERCEL_URL ?? "http://localhost:3000";
const isCI = process.env.CI === "true";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  globalTeardown:
    process.env.E2E_SKIP_GLOBAL_TEARDOWN === "1"
      ? undefined
      : "./e2e/utils/global-teardown.ts",
  timeout: 45_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // CI hits a deployed Vercel URL (no local-dev-server contention), so 2 workers
  // per shard is safe: 8 shards × 2 = 16 concurrent, well within HubSpot's
  // 100 req/sec app limit. Local dev server saturates at 4.
  workers: isCI ? 2 : 4,
  reporter: isCI ? [["list"], ["blob"]] : [["html", { open: "on-failure" }]],

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
