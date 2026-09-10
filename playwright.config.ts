import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 * Configured specifically for Narriv on macOS (Chromium + native WebKit).
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/artifacts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    /* Base URL pointing to Narriv frontend on port 3001 */
    baseURL: process.env.BASE_URL || 'http://localhost:3001',

    /* Browser default headed in dev (headless: false), overridden in CI */
    headless: process.env.CI ? true : false,

    /* Collect trace, screenshot, and video for failure diagnosis */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    /* macOS standard testing viewport */
    viewport: { width: 1280, height: 720 },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],

  /* Run dev server before starting the tests if START_SERVER is enabled */
  ...(process.env.START_SERVER
    ? {
        webServer: {
          command: 'npm run dev',
          url: 'http://localhost:3001',
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
      }
    : {}),
});
