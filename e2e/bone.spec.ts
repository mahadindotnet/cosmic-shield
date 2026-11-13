import { expect, test, type Page } from "@playwright/test";
import { signInOk } from "./helpers";

/** Bone protection end to end, as CS-002 (14 seeded daily logs ending yesterday). */

const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

test("CS-002 logs exercise and intake: history, status cards, dashboard tile and exercise days", async ({ page }) => {
  await signInOk(page, "CS-002");
  const exerciseDaysBefore = Number(await visible(page, "streak-panel").getByTestId("streak-exercise").innerText());

  await page.goto("/dashboard/bone");
  const rows = visible(page, "bone-history").getByTestId("bone-history-row");
  await expect(rows).toHaveCount(14);
  const cards = visible(page, "bone-status-cards");
  await expect(cards).toContainText("Target 1000 mg/day · NASA");
  await expect(cards).toContainText("Target 800 IU/day · NASA");

  // Nothing filled in: rejected with a message, nothing saved.
  const form = visible(page, "bone-form");
  await form.getByRole("button", { name: "Log entry" }).click();
  await expect(visible(page, "entry-aerobicMinutes-error")).toHaveText("Log some exercise or intake.");
  await expect(rows).toHaveCount(14);

  await form.getByLabel("Aerobic").fill("45");
  await form.getByLabel("Resistance").fill("30");
  await form.getByLabel("Load").fill("60");
  await form.getByLabel("Reps").fill("30");
  await form.getByLabel("Calcium").fill("600");
  await form.getByLabel("Vitamin D").fill("400");
  await form.getByRole("button", { name: "Log entry" }).click();

  await expect(visible(page, "bone-result")).toHaveText("Saved: 75 min of exercise.");
  await expect(rows).toHaveCount(15);
  await expect(rows.first()).toContainText("60 kg × 30");
  await expect(rows.first()).toContainText("Logged");
  const exerciseCard = cards.locator('[data-slot="card"]').filter({ hasText: "Exercise today" });
  await expect(exerciseCard).toContainText("75");
  await expect(exerciseCard).toContainText("45 aerobic · 30 resistance");
  await expect(cards.locator('[data-slot="card"]').filter({ hasText: "Calcium today" })).toContainText("60 % of the daily target");

  await page.goto("/dashboard");
  const tile = visible(page, "tile-bone");
  await expect(tile).toHaveAttribute("data-status", "normal");
  await expect(tile).toContainText("Exercise today");
  await expect(tile).toContainText("75");
  await expect(visible(page, "streak-panel").getByTestId("streak-exercise")).toHaveText(String(exerciseDaysBefore + 1));
});
