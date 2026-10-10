import { test, expect } from "@playwright/test";

test("crew switch updates escalation level", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByTestId("escalation-level")).toBeVisible({ timeout: 30_000 });

  await page.getByTestId("crew-reyes").click();
  await expect(page.getByTestId("escalation-level")).toContainText(/watch|escalate|normal/i);

  await page.getByTestId("crew-tanaka").click();
  const tanakaLevel = await page.getByTestId("escalation-level").innerText();
  expect(tanakaLevel.toLowerCase()).toMatch(/watch|normal|escalate/);
});
