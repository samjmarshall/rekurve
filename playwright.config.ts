import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT ?? 3000;
const baseURL = `http://localhost:${PORT}`;
const isCI = process.env.CI === 'true';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI
    ? [['list'], ['html', { open: 'never' }]]
    : [['html', { open: 'on-failure' }]],

  outputDir: 'test-results/',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    command: 'yarn dev',
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !isCI,
  },

  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 14'],
        viewport: { width: 375, height: 667 },
      },
    },
  ],
});
