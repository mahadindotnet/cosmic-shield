import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";
import { signInOk } from "./helpers";

/**
 * A valid, signed session cookie whose user no longer exists must not render a
 * broken app: it is cleared and the browser lands on /login. Runs in its own
 * project after every other test, because it deletes / changes demo accounts
 * in the test database (globalSetup reseeds it before the next run).
 */

const TEST_DB = "data/cosmic-shield.test.db";

function onTestDb(fn: (db: Database.Database) => void) {
  const db = new Database(TEST_DB);
  try {
    fn(db);
  } finally {
    db.close();
  }
}

test("user deleted while signed in: reload lands on /login and the cookie is gone", async ({ page }) => {
  await signInOk(page, "CS-004");
  await page.goto("/dashboard/vitals");
  await expect(page.getByTestId("account-crew-id")).toHaveText("CS-004");

  onTestDb((db) => db.prepare("DELETE FROM users WHERE crew_id = ?").run("CS-004"));

  await page.reload();
  await expect(page).toHaveURL(/\/login\?stale=1$/, { timeout: 30_000 });
  await expect(page.getByTestId("login-stale")).toContainText("Please sign in again");
  expect((await page.context().cookies()).some((c) => c.name.includes("session") && c.value)).toBe(false);
  // Cached client state for the old account is gone too.
  await expect.poll(() => page.evaluate(() => localStorage.getItem("cosmic-shield:mission"))).toBeNull();

  // And it stays signed out: no half-rendered dashboard.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("reseed with the same user id (account re-created after the session): reload lands on /login", async ({ page }) => {
  await signInOk(page, "CS-001");
  await expect(page.getByTestId("account-crew-id")).toHaveText("CS-001");

  // A reseed re-creates the account; even if the id were reused, the session predates it.
  onTestDb((db) => db.prepare("UPDATE users SET created_at = ? WHERE crew_id = ?").run(new Date(Date.now() + 60_000).toISOString(), "CS-001"));

  await page.reload();
  await expect(page).toHaveURL(/\/login\?stale=1$/, { timeout: 30_000 });
  await expect(page.getByTestId("login-stale")).toBeVisible();
});
