import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests run against the Vite dev server started by the webServer option below.
 * Supabase API calls are mocked inside each spec via page.route() interceptors
 * so tests are fully deterministic and require no live backend.
 *
 * Run:
 *   npx playwright test             – all tests (headless)
 *   npx playwright test --ui        – interactive UI mode
 *   npx playwright test auth        – only auth.spec.ts
 *   npx playwright show-report      – open HTML report
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect:  { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries:    process.env.CI ? 2 : 0,
  workers:    process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['line'],
  ],

  use: {
    baseURL:  'http://localhost:5173',
    trace:    'on-first-retry',
    video:    'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  // All three browser projects are defined.
  // `npm run test:e2e` runs Chromium only (fast, no extra installs needed).
  // `npm run test:e2e:full` runs all three (requires: npx playwright install).
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile',   use: { ...devices['Pixel 5'] } },
  ],

  /* Start Vite dev server automatically before the test run */
  webServer: {
    command: 'npm run dev',
    url:     'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
