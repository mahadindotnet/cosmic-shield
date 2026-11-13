import { expect, test } from "@playwright/test";
import { signInOk } from "./helpers";

const HEADLINE = "HRV has dropped for three nights. Sleep is down.";

test("CS-003 sees the calm early-warning card with its numbers and can dismiss it for today", async ({
  page,
}) => {
  await signInOk(page, "CS-003");
  const card = page.getByTestId("early-warning-card");
  await expect(card).toBeVisible();
  await expect(card.getByRole("heading", { name: HEADLINE })).toBeVisible();
  await expect(card).toContainText(
    "Here's what this pattern may mean, and what you can do next.",
  );
  await expect(card).toContainText(
    "Follow the station's sleep-shift lighting schedule.",
  );
  await expect(card).toContainText("Decision support, not a diagnosis.");
  await expect(card.getByText("Watch", { exact: true })).toBeVisible();

  // "Why am I seeing this?" shows the rule, per-night numbers with units, and citations.
  await card.getByText("Why am I seeing this?").click();
  const why = card.getByTestId("ew-why");
  await expect(why).toContainText("hrv_sleep_decline");
  await expect(why).toContainText("app heuristic");
  await expect(why.getByTestId("ew-why-table")).toContainText(
    "HRV (RMSSD, ms)",
  );
  await expect(why.getByTestId("ew-why-table").locator("tbody tr")).toHaveCount(
    4,
  ); // 3 nights + average
  await expect(
    why.getByRole("link", {
      name: /Sleep Loss, Circadian Desynchronization, and Work Overload/,
    }),
  ).toHaveAttribute(
    "href",
    "https://humanresearchroadmap.nasa.gov/Risks/?i=100",
  );

  // Dismiss for today: gone now and after a reload.
  await card.getByTestId("ew-dismiss").click();
  await expect(page.getByTestId("early-warning-card")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("streak-panel")).toBeVisible();
  await expect(page.getByTestId("early-warning-card")).toHaveCount(0);
});

test("CS-002 (normal pattern) sees no early-warning card", async ({ page }) => {
  // CS-002, not CS-001: the sleep test logs low nights for CS-001.
  await signInOk(page, "CS-002");
  await expect(page.getByTestId("streak-panel")).toBeVisible();
  await expect(page.getByTestId("early-warning-card")).toHaveCount(0);
});
