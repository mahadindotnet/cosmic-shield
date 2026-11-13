import { expect, type Page } from "@playwright/test";

export const DEMO = {
  "CS-001": "472915",
  "CS-002": "538204",
  "CS-003": "619473",
  "CS-004": "705318",
  "FS-001": "846251",
} as const;

/** Signs in through the real form (typing, not the keypad). */
export async function signIn(page: Page, crewId: string, pin: string) {
  await page.goto("/login?switch=1");
  await page.getByTestId("login-crew-id").fill(crewId);
  await page.getByTestId("login-pin").fill(pin);
  await page.getByTestId("login-submit").click();
}

export async function signInOk(page: Page, crewId: keyof typeof DEMO, opts: { keepEnvironmentDialog?: boolean } = {}) {
  await signIn(page, crewId, DEMO[crewId]);
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
  await expect(page.getByTestId("account-crew-id")).toHaveText(crewId);
  if (!opts.keepEnvironmentDialog) await chooseEnvironmentLater(page);
}

/**
 * Crew without a mission environment get the "Choose your mission environment"
 * dialog after login. Most tests aren't about it: close it with "Choose later"
 * (hidden for the rest of this login session). The marker is rendered with the
 * account menu, so this never waits on a timeout.
 */
export async function chooseEnvironmentLater(page: Page) {
  if ((await page.getByTestId("env-prompt-pending").count()) === 0) return;
  const dialog = page.getByTestId("env-dialog");
  await expect(dialog).toBeVisible();
  // The dialog closes at once and saves "Choose later" in the background:
  // wait for that Server Action, so a saved session (storageState) includes it.
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && Boolean(r.request().headers()["next-action"]));
  await dialog.getByTestId("env-dialog-later").click();
  await expect(dialog).toHaveCount(0);
  await saved;
}
