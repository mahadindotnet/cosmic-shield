import { expect, test, type Page } from "@playwright/test";
import { signInOk } from "./helpers";

/**
 * Environment dialog, Back button and notification bell, as CS-004. Runs in
 * the last project, after the lockout test (which uses CS-004) has finished.
 */

const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

async function logOutAndIn(page: Page) {
  await page.getByTestId("logout-button").click();
  await expect(page).toHaveURL(/\/login$/);
  await signInOk(page, "CS-004", { keepEnvironmentDialog: true });
}

test("environment dialog: Esc means Choose later (back at the next login); choosing ISS saves it for good", async ({ page }) => {
  await signInOk(page, "CS-004", { keepEnvironmentDialog: true });
  const dialog = page.getByTestId("env-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Choose your mission environment" })).toBeVisible();
  await expect(dialog.getByRole("radio")).toHaveCount(4);
  await expect(dialog.getByTestId("env-dialog-mars-transit")).toContainText("3–22 min comms delay one way");
  // Focus starts inside the dialog, on the first card.
  await expect(dialog.getByTestId("env-dialog-iss")).toBeFocused();

  // Esc = Choose later: gone for this session…
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("account-crew-id")).toHaveText("CS-004");
  await expect(page.getByTestId("env-dialog")).toHaveCount(0);

  // …and back at the next login. Keyboard: arrow to Lunar, back to ISS, confirm.
  await logOutAndIn(page);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByTestId("env-dialog-lunar")).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.getByTestId("env-dialog-iss")).toHaveAttribute("aria-checked", "true");
  await dialog.getByTestId("env-dialog-confirm").click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("space-backdrop")).toHaveAttribute("data-environment", "iss");
  await expect(page.getByTestId("topbar-mission-iss")).toHaveAttribute("aria-checked", "true");

  // Saved on the account: not shown again, even after a new login.
  await logOutAndIn(page);
  await expect(page.getByTestId("space-backdrop")).toHaveAttribute("data-environment", "iss");
  await expect(page.getByTestId("env-dialog")).toHaveCount(0);
});

test("Back returns to the previous page, and to the Health Dashboard when there is no in-app history", async ({ page }) => {
  await signInOk(page, "CS-004");
  await expect(page.getByTestId("back-button")).toHaveCount(0); // not on the dashboard home

  await page.getByTestId("nav-vitals").click();
  await expect(page).toHaveURL(/\/dashboard\/vitals$/);
  await page.getByTestId("nav-mind").click();
  await expect(page).toHaveURL(/\/dashboard\/mind$/);

  const back = visible(page, "back-button");
  await expect(back).toHaveAccessibleName("Go back");
  await back.click();
  await expect(page).toHaveURL(/\/dashboard\/vitals$/);
  await visible(page, "back-button").click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Opened directly (full page load, no in-app history): falls back to the dashboard.
  await page.goto("/dashboard/radiation");
  await visible(page, "back-button").click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("the bell shows Daily check-in due until a check-in is submitted; read items stay, greyed", async ({ page }) => {
  await signInOk(page, "CS-004");
  const bell = page.getByTestId("notification-bell");
  const badge = page.getByTestId("notification-badge");
  await expect(badge).toBeVisible();
  const before = Number(await badge.innerText());

  await bell.click();
  const panel = page.getByTestId("notification-panel");
  const checkinDue = panel.getByTestId("notification-item").filter({ hasText: "Daily check-in due" });
  await expect(checkinDue).toContainText("Log in and check in every day to keep your streak.");
  const vitalsDue = panel.getByTestId("notification-item").filter({ hasText: "Morning vitals not logged yet today" });
  await expect(vitalsDue).toBeVisible();

  // Mark one read: it stays, greyed, and the badge drops by one.
  await vitalsDue.getByTestId("notification-mark-read").click();
  await expect(vitalsDue).toHaveAttribute("data-read", "true");
  await expect(badge).toHaveText(String(before - 1));
  await page.keyboard.press("Escape");

  // Submit today's check-in: the task disappears by itself.
  await page.goto("/dashboard/mind");
  const form = visible(page, "checkin-form");
  await form.getByRole("radio", { name: "Mood (1 low – 5 great): 4" }).check({ force: true });
  await form.getByRole("radio", { name: "Stress (1 calm – 5 overwhelmed): 2" }).check({ force: true });
  await form.getByRole("button", { name: "Log entry" }).click();
  await expect(visible(page, "checkin-result")).toContainText("Saved");

  await bell.click();
  await expect(panel.getByTestId("notification-item").filter({ hasText: "Daily check-in due" })).toHaveCount(0);
  await expect(panel.getByTestId("notification-item").filter({ hasText: "Morning vitals not logged yet today" })).toHaveAttribute("data-read", "true");
});
