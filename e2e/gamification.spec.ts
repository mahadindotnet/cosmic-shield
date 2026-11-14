import { expect, test, type Page } from "@playwright/test";
import { pick, signInOk } from "./helpers";

/**
 * Points and streaks from real activity, as CS-003 (14 seeded daily check-ins
 * ending yesterday, none today). Runs in the last project.
 */

const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

async function checkIn(page: Page) {
  await page.goto("/dashboard/mind");
  const form = visible(page, "checkin-form");
  await pick(form.getByRole("radio", { name: "Mood (1 low – 5 great): 4" }));
  await pick(form.getByRole("radio", { name: "Stress (1 calm – 5 overwhelmed): 2" }));
  await form.getByRole("button", { name: "Log entry" }).click();
  await expect(visible(page, "checkin-result")).toContainText("Saved");
  await page.goto("/dashboard");
}

test("a check-in extends the streak and earns points once a day; the bell names the streak", async ({ page }) => {
  await signInOk(page, "CS-003");
  const panel = visible(page, "streak-panel");
  await expect(panel.getByTestId("streak-current")).toHaveText("14");
  await expect(panel.getByTestId("streak-best")).toHaveText("14");
  await expect(panel).toContainText("Check in before midnight UTC to keep it.");
  const points = Number(await panel.getByTestId("streak-points").innerText());
  expect(points).toBeGreaterThan(0);

  await page.getByTestId("notification-bell").click();
  await expect(page.getByTestId("notification-panel")).toContainText("Daily check-in due: keep your 14-day streak");
  await page.keyboard.press("Escape");

  // First check-in today: streak 15, +10 points (app default), reminder gone.
  await checkIn(page);
  await expect(panel.getByTestId("streak-current")).toHaveText("15");
  await expect(panel.getByTestId("streak-best")).toHaveText("15");
  await expect(panel).toContainText("Checked in today. Streak safe.");
  await expect(panel.getByTestId("streak-points")).toHaveText(String(points + 10));
  await page.getByTestId("notification-bell").click();
  await expect(page.getByTestId("notification-panel")).not.toContainText("Daily check-in due");
  await page.keyboard.press("Escape");

  // A second check-in the same day earns nothing more.
  await checkIn(page);
  await expect(panel.getByTestId("streak-current")).toHaveText("15");
  await expect(panel.getByTestId("streak-points")).toHaveText(String(points + 10));
});
