import { expect, test } from "@playwright/test";
import { signInOk } from "./helpers";

const HEADLINE = "HRV has dropped for three nights. Sleep is down.";

// The co-pilot test needs CS-003's card before the next test dismisses it for today.
test.describe.configure({ mode: "serial" });

test("CS-003 asks the co-pilot from the card: hrv_sleep_decline, the HRV % drop and tool chips", async ({ page }) => {
  await signInOk(page, "CS-003");
  const card = page.getByTestId("early-warning-card");
  await expect(card).toBeVisible();
  await card.getByTestId("ew-copilot").click();

  const panel = page.getByTestId("copilot-panel");
  await expect(panel).toBeVisible();
  const input = panel.getByTestId("copilot-input");
  await expect(input).toHaveValue("Why am I seeing this warning?");
  await panel.getByTestId("copilot-send").click();

  const answer = panel.getByTestId("copilot-answer").last();
  await expect(answer).toContainText("hrv_sleep_decline", { timeout: 30_000 });
  await expect(answer).toContainText(/HRV \(RMSSD\) was \d+(\.\d)?% below your own baseline/);
  await expect(answer).toContainText("Source:");
  const chips = panel.getByTestId("copilot-tool-chip");
  await expect(chips.filter({ hasText: "Checked active alerts · Rules engine" })).toBeVisible();
  await expect(chips.filter({ hasText: "Looked up guidance" }).first()).toBeVisible();
  await expect(panel.getByTestId("copilot-footer")).toContainText("Decision support, not a diagnosis · Mode: offline (mock)");
});

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
  await expect(page.getByTestId("streak-panel").filter({ visible: true })).toBeVisible();
  await expect(page.getByTestId("early-warning-card")).toHaveCount(0);
});

test("CS-002 (normal pattern) sees no early-warning card", async ({ page }) => {
  // CS-002, not CS-001: the sleep test logs low nights for CS-001.
  await signInOk(page, "CS-002");
  await expect(page.getByTestId("streak-panel").filter({ visible: true })).toBeVisible();
  await expect(page.getByTestId("early-warning-card")).toHaveCount(0);
});
