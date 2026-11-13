import { expect, test, type Page } from "@playwright/test";
import { signInOk } from "./helpers";

/** Next keeps visited routes mounted but hidden, so scope to what is on screen. */
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

test("CS-001 picks ISS and asks about radiation: career total, 600 mSv and the RadLab chip (offline mock)", async ({ page }) => {
  // The floating button bobs; freeze motion so Playwright can click it.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signInOk(page, "CS-001");

  // Career total as the dashboard shows it ("X of 600 mSv logged").
  const stat = visible(page, "stat-career-dose");
  await expect(stat).toContainText(/[\d.]+ of 600 mSv logged/);
  const total = (await stat.innerText()).match(/([\d.]+) of 600 mSv logged/)![1];

  await page.getByTestId("topbar-mission-iss").click();
  await expect(page.getByTestId("space-backdrop")).toHaveAttribute("data-environment", "iss");

  await page.getByTestId("copilot-button").click();
  const panel = page.getByTestId("copilot-panel");
  await panel.getByTestId("copilot-input").fill("What's my radiation status?");
  await panel.getByTestId("copilot-send").click();

  const answer = panel.getByTestId("copilot-answer").last();
  await expect(answer).toContainText(`Your career dose is ${total} mSv`, { timeout: 30_000 });
  await expect(answer).toContainText("600 mSv");
  await expect(answer).toContainText("on ISS");
  await expect(panel.getByTestId("copilot-tool-chip").filter({ hasText: "Checked radiation status · NASA RadLab" })).toBeVisible();
  await expect(panel.getByTestId("copilot-question").last()).toHaveText("What's my radiation status?");
});
