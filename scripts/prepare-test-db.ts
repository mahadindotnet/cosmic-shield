/**
 * Creates/refreshes the e2e test database (data/cosmic-shield.test.db): applies
 * the migrations, then seeds it. Run by Playwright's globalSetup; never touches
 * the demo database.
 *
 *   npm run db:test:prepare
 */
import { execSync } from "node:child_process";
import { runMigrations } from "./migrate";

export const TEST_DATABASE_URL = "file:./data/cosmic-shield.test.db";
/** Same folder as playwright.config.ts gives the test server (gitignored). */
export const TEST_UPLOADS_DIR = "uploads-test";

export function prepareTestDb() {
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL, UPLOADS_DIR: TEST_UPLOADS_DIR };
  // Schema in place (no file delete: the test server may already have it open).
  runMigrations(TEST_DATABASE_URL);
  // Seed clears every table (and the test photos) and inserts fresh demo data and accounts.
  execSync("npx tsx --env-file-if-exists=.env scripts/seed.ts", { env, stdio: "inherit" });
}

if (/prepare-test-db\.ts$/.test(process.argv[1] ?? "")) {
  prepareTestDb();
}
