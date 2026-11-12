/**
 * Creates/refreshes the e2e test database (data/cosmic-shield.test.db): pushes
 * the schema, then seeds it. Run by Playwright's globalSetup; never touches
 * the demo database.
 *
 *   npm run db:test:prepare
 */
import { execSync } from "node:child_process";

export const TEST_DATABASE_URL = "file:./data/cosmic-shield.test.db";

export function prepareTestDb() {
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
  // Schema in place (no file delete: the test server may already have it open).
  execSync("npx drizzle-kit push --force", { env, stdio: "pipe" });
  // Seed clears every table and inserts fresh demo data and accounts.
  execSync("npx tsx --env-file-if-exists=.env scripts/seed.ts", { env, stdio: "inherit" });
}

if (/prepare-test-db\.ts$/.test(process.argv[1] ?? "")) {
  prepareTestDb();
}
