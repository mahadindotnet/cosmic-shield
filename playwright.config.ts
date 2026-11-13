import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against their own dev server (port 3100) and their own SQLite
 * file, data/cosmic-shield.test.db, which globalSetup migrates and seeds fresh.
 * The demo database is never touched.
 *
 *   npm run test:e2e                      # bundled Chromium
 *   PW_CHANNEL=msedge npm run test:e2e    # or an installed Edge/Chrome
 */
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const TEST_DATABASE_URL = "file:./data/cosmic-shield.test.db";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  // The test server is a dev server: first visits compile on demand.
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
  },
  projects: [
    // Signs in once as CS-001 and saves the cookie for the dashboard tests.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    // Tests that sign in themselves (no saved session).
    { name: "auth", testMatch: /(auth|early-warning|vitals|radiation)\.spec\.ts/ },
    {
      name: "dashboard",
      testMatch: /dashboard\.spec\.ts/,
      dependencies: ["setup"],
      use: { storageState: "e2e/.auth/crew.json" },
    },
    // Changes CS-001's sleep data (the early-warning card appears), so it runs
    // after the dashboard tests that share CS-001's session.
    { name: "after-dashboard", testMatch: /sleep-stress\.spec\.ts/, dependencies: ["dashboard"] },
  ],
  webServer: {
    command: `npx next dev --turbopack --port ${PORT}`,
    url: `${baseURL}/login`,
    // Always start our own server so it is guaranteed to use the test database.
    reuseExistingServer: false,
    timeout: 180_000,
    env: { DATABASE_URL: TEST_DATABASE_URL, NEXT_DIST_DIR: ".next-test", NEXT_TSCONFIG_PATH: "tsconfig.e2e.json" },
  },
});
