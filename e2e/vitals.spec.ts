import { test, expect, type Page } from "@playwright/test";
import { signInOk } from "./helpers";

/** Next keeps visited routes mounted but hidden, so scope to what is on screen. */
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

/**
 * Vitals end to end: a crew member logs a reading, the rules run on read, and
 * the page and the Health Dashboard show the same result. Data stays private.
 */
test("CS-001 logs BP 150/95: Watch on the page, in history and on the dashboard; CS-002 can't see it", async ({ browser }) => {
  const crew1 = await browser.newContext();
  const page = await crew1.newPage();
  await signInOk(page, "CS-001");

  await page.goto("/dashboard/vitals");
  // AI-generated illustration: visibly labelled (Space Apps rule).
  await expect(page.getByTestId("ai-generated-label").filter({ visible: true })).toHaveText("AI-generated image");
  const history = visible(page, "vitals-history");
  // 14 seeded mornings are there before the entry.
  await expect(history.getByTestId("vitals-history-row")).toHaveCount(14);

  const form = visible(page, "vitals-form");
  await form.getByLabel("Heart rate").fill("72");
  await form.getByLabel("SpO₂").fill("98");
  await form.getByLabel("Systolic").fill("150");
  await form.getByLabel("Diastolic").fill("95");
  await form.getByRole("button", { name: "Log entry" }).click();

  // Saved, and the rules put it in Watch.
  await expect(visible(page, "vitals-result")).toContainText("Watch");
  await expect(visible(page, "vitals-result")).toContainText("Systolic 150 mmHg");

  // Newest history row is the new reading.
  const rows = history.getByTestId("vitals-history-row");
  await expect(rows).toHaveCount(15);
  await expect(rows.first()).toContainText("150/95");
  await expect(rows.first()).toContainText("Logged");
  await expect(rows.first()).toHaveAttribute("data-status", "watch");

  // Status cards follow the latest reading.
  const cards = visible(page, "vitals-status-cards");
  await expect(cards.locator('[data-status="watch"]').filter({ hasText: "150/95" })).toBeVisible();

  // The Health Dashboard tile reads the same data.
  await page.goto("/dashboard");
  const tile = visible(page, "tile-vitals");
  await expect(tile).toHaveAttribute("data-status", "watch");
  await expect(tile).toContainText("Blood pressure");
  await expect(tile).toContainText("150/95");
  await crew1.close();

  // Another crew member never sees it.
  const crew2 = await browser.newContext();
  const page2 = await crew2.newPage();
  await signInOk(page2, "CS-002");
  await page2.goto("/dashboard/vitals");
  const rows2 = visible(page2, "vitals-history").getByTestId("vitals-history-row");
  await expect(rows2).toHaveCount(14);
  await expect(visible(page2, "vitals-history")).not.toContainText("150/95");
  await page2.goto("/dashboard");
  await expect(visible(page2, "tile-vitals")).toHaveAttribute("data-status", "normal");
  await crew2.close();
});

test("rejects an impossible reading, then SpO₂ 88 escalates with flight-surgeon guidance", async ({ page }) => {
  // CS-003: CS-004 is locked and unlocked by the auth tests running alongside.
  // One test so the history counts can't race.
  await signInOk(page, "CS-003");
  await page.goto("/dashboard/vitals");
  const form = visible(page, "vitals-form");
  await form.getByLabel("Heart rate").fill("72");
  await form.getByLabel("SpO₂").fill("130");
  await form.getByLabel("Systolic").fill("90");
  await form.getByLabel("Diastolic").fill("95");
  await form.getByRole("button", { name: "Log entry" }).click();

  await expect(visible(page, "entry-spo2-error")).toHaveText("SpO₂ must be 50–100.");
  await expect(visible(page, "entry-diastolic-error")).toHaveText("Diastolic must be lower than systolic.");
  await expect(form.getByLabel("Heart rate")).toHaveValue("72");
  const rows = visible(page, "vitals-history").getByTestId("vitals-history-row");
  await expect(rows).toHaveCount(14);

  // SpO₂ 88 % (WHO: below 90 % is a clinical emergency) → Escalate.
  await form.getByLabel("SpO₂").fill("88");
  await form.getByLabel("Systolic").fill("118");
  await form.getByLabel("Diastolic").fill("74");
  await form.getByRole("button", { name: "Log entry" }).click();

  const result = visible(page, "vitals-result");
  await expect(result).toContainText("Escalate");
  await expect(result).toContainText("SpO₂ 88 % is below the Escalate level (90 %).");
  await expect(result.getByTestId("escalate-guidance")).toContainText("Contact the flight surgeon");
  await expect(rows).toHaveCount(15);
  await expect(rows.first()).toHaveAttribute("data-status", "escalate");
  // The hero repeats the guidance in full.
  await expect(page.getByTestId("escalate-guidance").filter({ visible: true }).filter({ hasText: "evidence record has been sent" })).toBeVisible();

  await page.goto("/dashboard");
  const tile = visible(page, "tile-vitals");
  await expect(tile).toHaveAttribute("data-status", "escalate");
  await expect(tile).toContainText("SpO₂");
});

test("the flight surgeon is view-only on Vitals", async ({ page }) => {
  await signInOk(page, "FS-001");
  await page.goto("/dashboard/vitals");
  await expect(visible(page, "vitals-form")).toContainText("Flight surgeons are view-only");
  await expect(visible(page, "vitals-form").getByRole("button", { name: "Log entry" })).toHaveCount(0);
});

test("glucose shows the Inspiration4 crew reference band", async ({ page }) => {
  await signInOk(page, "CS-002");
  await page.goto("/dashboard/vitals");
  await expect(visible(page, "glucose-crew-reference")).toHaveText("Inspiration4 crew reference (n=4): 56–100 mg/dL");
  await expect(visible(page, "trend-glucose").getByTestId("trend-reference-legend")).toContainText(
    "Inspiration4 crew reference (n=4) 56–100 mg/dL",
  );
});
