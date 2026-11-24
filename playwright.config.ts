import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

/**
 * End-to-end tests run against a production build with its own freshly
 * seeded PGlite database, so they never touch the one `bun dev` uses.
 */
export default defineConfig({
  testDir: './e2e',
  // The tests share one database, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `bun run build && bun run db:seed && bun run start -p ${PORT}`,
    url: baseURL,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? '.pglite-e2e',
      BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET: 'e2e-only-secret-not-used-anywhere-else',
      AUTH_RATE_LIMIT: 'off',
    },
  },
});
