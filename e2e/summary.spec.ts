import { expect, test, type Page } from "@playwright/test";
import { signInOk } from "./helpers";

/**
 * Health Dashboard Alerts card and tile empty states. Runs in the last
 * project, after the specs that create CS-003's alerts (vitals SpO₂ 88,
 * radiation 2 mSv) and CS-002's support follow-up (mind spec).
 */

const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

test("CS-004: All clear, real tiles, and a clear empty state on modules without entries (Eyes, GI)", async ({ page }) => {
  await signInOk(page, "CS-004");
  const card = visible(page, "alerts-summary");
  await expect(card).toHaveAttribute("data-state", "clear");
  await expect(card).toContainText("All clear");

  // Real data (seeded vitals and bone logs): a number and a status, no empty text.
  await expect(visible(page, "tile-vitals")).toHaveAttribute("data-status", "normal");
  await expect(visible(page, "tile-bone")).toHaveAttribute("data-status", "normal");
  // Modules without entries say so plainly; no number, no made-up status.
  for (const slug of ["eyes", "gi"]) {
    const tile = visible(page, `tile-${slug}`);
    await expect(tile).toHaveAttribute("data-status", "no-data");
    await expect(tile.getByTestId("tile-empty")).toHaveText("No entries yet: log your first reading");
  }
  await expect(visible(page, "stat-eyes")).toContainText("No screening logged yet");
  // Points aren't computed yet: no fake 0.
  await expect(visible(page, "streak-panel")).not.toContainText(/Points\s*0/);
});

test("CS-003: every active Watch/Escalate is listed, Escalate first, each linking to its module", async ({ page }) => {
  await signInOk(page, "CS-003");
  const card = visible(page, "alerts-summary");
  await expect(card).toHaveAttribute("data-state", "active");
  const items = card.getByTestId("alerts-summary-item");
  await expect(items.first()).toHaveAttribute("data-rule", "vitals");
  await expect(items.first()).toContainText("Escalate");
  await expect(card.locator('[data-rule="hrv_sleep_decline"]')).toBeVisible();
  await expect(card.locator('[data-rule="radiation_daily"]')).toBeVisible();

  await card.locator('[data-rule="hrv_sleep_decline"]').getByRole("link").click();
  await expect(page).toHaveURL(/\/dashboard\/sleep-stress$/);
});

test("CS-002: an open safety escalation shows only as 'Support follow-up open', with no details", async ({ page }) => {
  await signInOk(page, "CS-002");
  const card = visible(page, "alerts-summary");
  const followUp = card.locator('[data-rule="mind_safety"]');
  await expect(followUp).toHaveText(/Follow-up\s*Support follow-up open/);
  await expect(card).not.toContainText("hopeless");
  await expect(card).not.toContainText("Safety check");
  await followUp.getByRole("link").click();
  await expect(page).toHaveURL(/\/dashboard\/mind#mind-talk$/);
});

test("FS-001: no crew data on the dashboard, a pointer to Crew admin instead", async ({ page }) => {
  await signInOk(page, "FS-001");
  const card = visible(page, "alerts-summary");
  await expect(card).toHaveAttribute("data-state", "surgeon");
  await expect(card.getByRole("link", { name: "Review crew alerts and escalations in Crew admin" })).toHaveAttribute("href", "/dashboard/admin");
  await expect(visible(page, "tile-vitals").getByTestId("tile-empty")).toHaveText("Crew data is in Crew admin");
});
