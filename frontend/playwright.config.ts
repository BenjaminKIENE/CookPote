import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config.
 * Starts the Angular dev server and the backend (test mode) before running.
 *
 * Required env vars (set in CI or .env.e2e):
 *   - All vars from backend/.env.e2e are loaded by the backend start script
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Tests share the same backend DB instance
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  reporter: process.env['CI'] ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      // Backend in test mode — migrations run automatically on startup
      command: 'cross-env NODE_ENV=test $(cat .env.e2e | grep -v "^#" | xargs) tsx src/index.ts',
      cwd: '../backend',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env['CI'],
      timeout: 30_000,
    },
    {
      // Angular dev server
      command: 'ng serve --port 4200',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      timeout: 60_000,
    },
  ],
});
