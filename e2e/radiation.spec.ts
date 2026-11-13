import { expect, test, type Page } from "@playwright/test";
import { signInOk } from "./helpers";

/** Next keeps visited routes mounted but hidden, so scope to what is on screen. */
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

async function logDose(page: Page, doseMsv: string) {
  const form = visible(page, "dose-form");
  await form.getByLabel("Dose").fill(doseMsv);
  await form.getByLabel("Period covered").fill("24");
  await form.getByRole("button", { name: "Log entry" }).click();
}

/** The career total shown on the "Career total" status card. */
async function careerTotal(page: Page) {
  const card = visible(page, "radiation-status-cards").locator('[data-slot="card"]').filter({ hasText: "Career total" });
  const text = await card.locator(".font-mono.text-3xl").innerText();
  return Number(text);
}

test("CS-003 logs dosimeter readings: career total, Watch, history, dashboard and DONKI source", async ({ browser }) => {
  // CS-003 has not flown before (no career summary entry): 14 seeded daily readings.
  const context = await browser.newContext();
  const page = await context.newPage();
  await signInOk(page, "CS-003");
  await page.goto("/dashboard/radiation");

  const rows = visible(page, "radiation-history").getByTestId("radiation-history-row");
  await expect(rows).toHaveCount(14);
  await expect(visible(page, "radiation-status-cards")).toContainText("Career total");
  const before = await careerTotal(page);
  expect(before).toBeGreaterThan(9);
  expect(before).toBeLessThan(11);

  // A normal ISS-like day.
  await logDose(page, "0.9");
  await expect(visible(page, "dose-result")).toContainText("Normal");
  await expect(rows).toHaveCount(15);

  // 2 mSv in a day is at or above the default Watch level (1.4 mSv/d, no environment chosen).
  await logDose(page, "2");
  await expect(visible(page, "dose-result")).toContainText("Watch");
  await expect(visible(page, "dose-result")).toContainText("Dose rate 2 mSv/d is at or above the Watch level (1.4 mSv/d).");
  await expect(rows).toHaveCount(16);
  await expect(rows.first()).toHaveAttribute("data-status", "watch");

  // Career total = sum of every dose entry.
  await expect.poll(() => careerTotal(page)).toBeCloseTo(before + 2.9, 2);

  // DONKI alerts carry a source badge (live with an API key, otherwise the cached file).
  const badge = visible(page, "donki-source");
  await expect(badge).toContainText("NASA DONKI");
  await expect(badge).toHaveAttribute("data-origin", /^(live|derived|fixture)$/);

  // The Health Dashboard reads the same data.
  await page.goto("/dashboard");
  const tile = visible(page, "tile-radiation");
  await expect(tile).toHaveAttribute("data-status", "watch");
  await expect(tile).toContainText("2");
  await expect(visible(page, "stat-career-dose")).toContainText(`${Math.round((before + 2.9) * 100) / 100} of 600 mSv logged`);
  await context.close();

  // Another crew member's career is untouched (CS-002: 14 readings + a previous-mission summary).
  const other = await browser.newContext();
  const page2 = await other.newPage();
  await signInOk(page2, "CS-002");
  await page2.goto("/dashboard/radiation");
  await expect(visible(page2, "radiation-history").getByTestId("radiation-history-row")).toHaveCount(15);
  await other.close();
});

test("without an environment the projection asks for one, and Show me highlights the top-bar buttons", async ({ page }) => {
  // FS-001 never picks an environment in the tests.
  await signInOk(page, "FS-001");
  await page.goto("/dashboard/radiation");
  const prompt = visible(page, "radiation-status-cards").getByTestId("choose-env-prompt");
  await expect(prompt).toContainText("Choose your mission environment in the top bar to see your projected dose");
  await prompt.getByTestId("choose-env-show").click();
  const picker = page.getByTestId("topbar-mission-picker");
  await expect(picker).toHaveAttribute("data-highlight-at", /\d+/);
  await expect(page.getByTestId("topbar-mission-iss")).toBeFocused();
});
