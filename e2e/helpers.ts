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

export async function signInOk(page: Page, crewId: keyof typeof DEMO) {
  await signIn(page, crewId, DEMO[crewId]);
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
  await expect(page.getByTestId("account-crew-id")).toHaveText(crewId);
}
