import { test, expect } from "@playwright/test";

const TABS = [
  ["overview", "Overview"],
  ["vitals", "Vitals"],
  ["sleep-stress", "Sleep & Stress"],
  ["radiation", "Radiation"],
  ["bone", "Bone Protection"],
  ["eyes", "Eyes"],
  ["gi", "GI"],
  ["mind", "Mind"],
  ["mission", "Mission"],
] as const;

const BODY_SPOTS = [
  ["mind", "Mind"],
  ["eyes", "Eyes"],
  ["radiation", "Radiation"],
  ["vitals", "Vitals"],
  ["gi", "GI"],
  ["sleep-stress", "Sleep & Stress"],
  ["bone", "Bone Protection"],
] as const;

test("sidebar navigates all nine tabs", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible({ timeout: 30_000 });

  for (const [slug, title] of TABS) {
    await page.getByTestId(`nav-${slug}`).click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  }
});

test("body map hotspots open their module", async ({ page }) => {
  for (const [slug, title] of BODY_SPOTS) {
    await page.goto("/dashboard");
    await page.getByTestId(`body-${slug}`).click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  }
});

test("mission environment switches background and info, and is remembered", async ({ page }) => {
  // Next keeps previously visited routes mounted but hidden, so scope to visible elements.
  const visible = (testId: string) => page.getByTestId(testId).filter({ visible: true });

  await page.goto("/dashboard");
  const backdrop = page.getByTestId("space-backdrop");
  await expect(backdrop).toHaveAttribute("data-environment", "default");

  await visible("mission-mars-transit").click();
  await expect(backdrop).toHaveAttribute("data-environment", "mars-transit");
  await expect(page.getByTestId("header-mission")).toHaveText(/Mars transit · 3–22 min/);

  await page.getByTestId("nav-radiation").click();
  await expect(page.getByText("Watch above 3 mSv/d").filter({ visible: true })).toBeVisible();

  await page.getByTestId("nav-mission").click();
  await visible("mission-lunar").click();
  await expect(backdrop).toHaveAttribute("data-environment", "lunar");

  await page.reload();
  await expect(backdrop).toHaveAttribute("data-environment", "lunar");
});

test("sidebar collapses to icons and expands again", async ({ page }) => {
  await page.goto("/dashboard");
  const sidebar = page.locator('[data-slot="sidebar"][data-state]');
  await expect(sidebar).toHaveAttribute("data-state", "expanded");
  await page.getByTestId("sidebar-collapse").click();
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  await page.getByTestId("sidebar-collapse").click();
  await expect(sidebar).toHaveAttribute("data-state", "expanded");
});
