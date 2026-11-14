import { expect, test, type Page } from "@playwright/test";
import { pick, signInOk } from "./helpers";

/** Next keeps visited routes mounted but hidden, so scope to what is on screen. */
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

/** YYYY-MM-DD `n` days before today (UTC). */
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

async function logNight(page: Page, night: string, v: { sleep: string; hrv: string; quality: string; stress: string }) {
  const form = visible(page, "sleep-form");
  await form.getByLabel("Night of").fill(night);
  await form.getByLabel("Sleep", { exact: true }).fill(v.sleep);
  await form.getByLabel("HRV (optional)").fill(v.hrv);
  await pick(form.getByRole("radio", { name: `Sleep quality (1 poor – 5 great): ${v.quality}` }));
  await pick(form.getByRole("radio", { name: `Stress (1 calm – 5 overwhelmed): ${v.stress}` }));
  await form.getByRole("button", { name: "Log entry" }).click();
  await expect(visible(page, "sleep-result")).toContainText(`Saved night of ${new Date(`${night}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })}`);
}

test("CS-001 enters 3 low nights by hand: the early-warning card appears", async ({ page }) => {
  await signInOk(page, "CS-001");
  // Normal seeded pattern: no card yet.
  await expect(page.getByTestId("streak-panel").filter({ visible: true })).toBeVisible();
  await expect(page.getByTestId("early-warning-card")).toHaveCount(0);

  await page.goto("/dashboard/sleep-stress");
  const rows = visible(page, "sleep-history").getByTestId("sleep-history-row");
  await expect(rows).toHaveCount(14);

  // The last three nights, entered by hand: HRV far below CS-001's own ~42 ms baseline, short sleep.
  for (const back of [3, 2, 1]) {
    await logNight(page, daysAgo(back), { sleep: "4.8", hrv: "30", quality: "2", stress: "4" });
  }
  // Seeded entries for those nights stay in history, replaced (struck through).
  await expect(rows).toHaveCount(17);
  await expect(rows.first()).toHaveAttribute("data-status", "watch");
  await expect(visible(page, "sleep-status-cards")).toContainText("4.8");

  await page.goto("/dashboard");
  const card = page.getByTestId("early-warning-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText("HRV has dropped for three nights. Sleep is down.");
  const tile = visible(page, "tile-sleep-stress");
  await expect(tile).toHaveAttribute("data-status", "watch");
  await expect(tile).toContainText("Sleep last night");
  await expect(tile).toContainText("4.8");

  // Leave CS-001's dashboard as it was for anything that runs later today.
  await card.getByTestId("ew-dismiss").click();
  await expect(page.getByTestId("early-warning-card")).toHaveCount(0);
});

test("sleep form rejects a future night and keeps what was typed", async ({ page }) => {
  await signInOk(page, "CS-002");
  await page.goto("/dashboard/sleep-stress");
  const form = visible(page, "sleep-form");
  await form.getByLabel("Night of").fill(daysAgo(-2));
  await form.getByLabel("Sleep", { exact: true }).fill("7");
  await pick(form.getByRole("radio", { name: "Sleep quality (1 poor – 5 great): 4" }));
  await pick(form.getByRole("radio", { name: "Stress (1 calm – 5 overwhelmed): 2" }));
  await form.getByRole("button", { name: "Log entry" }).click();
  await expect(visible(page, "entry-night-error")).toHaveText("The night can't be in the future.");
  await expect(form.getByLabel("Sleep", { exact: true })).toHaveValue("7");
  await expect(visible(page, "sleep-history").getByTestId("sleep-history-row")).toHaveCount(14);
});
