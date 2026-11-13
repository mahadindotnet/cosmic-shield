import { test, expect, type Page } from "@playwright/test";
import { signInOk } from "./helpers";

const TABS = [
  ["overview", "Health Dashboard"],
  ["vitals", "Vitals"],
  ["sleep-stress", "Sleep & Stress"],
  ["radiation", "Radiation"],
  ["bone", "Bone Protection"],
  ["eyes", "Eyes"],
  ["gi", "GI"],
  ["mind", "Mind"],
  ["mission", "Mission"],
] as const;

/** Module pages show the tab name in the eyebrow above a display title. */
function visibleModuleHeading(page: Page, title: string) {
  return title === "Health Dashboard"
    ? page.getByRole("heading", { level: 1, name: "Health Dashboard" })
    : page.getByTestId("module-eyebrow").filter({ visible: true, hasText: title });
}

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
  await expect(page.getByRole("heading", { level: 1, name: "Health Dashboard" })).toBeAttached({ timeout: 30_000 });

  for (const [slug, title] of TABS) {
    await page.getByTestId(`nav-${slug}`).click();
    await expect(page).toHaveURL(slug === "overview" ? /\/dashboard$/ : new RegExp(`/dashboard/${slug}$`));
    await expect(visibleModuleHeading(page, title)).toBeVisible();
  }
});

test("body map hotspots open their module", async ({ page }) => {
  // The figure floats slowly; Playwright waits for elements to stop moving, so freeze it.
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [slug, title] of BODY_SPOTS) {
    await page.goto("/dashboard");
    await page.getByTestId(`body-${slug}`).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/${slug}$`));
    await expect(visibleModuleHeading(page, title)).toBeVisible();
  }
});

test("mission environment switches background and info, and is saved to the account", async ({ browser }) => {
  // Its own account (CS-002): the choice is stored per user, and the other
  // dashboard tests share CS-001's session.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await signInOk(page, "CS-002");
  // Next keeps previously visited routes mounted but hidden, so scope to visible elements.
  const visible = (testId: string) => page.getByTestId(testId).filter({ visible: true });

  await page.goto("/dashboard");
  const backdrop = page.getByTestId("space-backdrop");
  // No default image: plain background until an environment is chosen.
  await expect(backdrop).toHaveAttribute("data-environment", "none");

  // The environment buttons live in the top navigation bar.
  await page.getByTestId("topbar-mission-mars-transit").click();
  await expect(backdrop).toHaveAttribute("data-environment", "mars-transit");
  await expect(page.getByTestId("topbar-mission-mars-transit")).toHaveAttribute("aria-checked", "true");
  await expect(visible("mission-context")).toContainText("3–22 min");

  await page.getByTestId("nav-radiation").click();
  await expect(page.getByText("Typical on Mars transit: 1.84 mSv/d").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Below watch 0–3.7 mSv/d").filter({ visible: true })).toBeVisible();

  await page.getByTestId("nav-mission").click();
  await visible("mission-lunar").click();
  await expect(backdrop).toHaveAttribute("data-environment", "lunar");

  await page.reload();
  await expect(backdrop).toHaveAttribute("data-environment", "lunar");

  // Saved on the account, not just this browser: a fresh browser gets it too.
  const other = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page2 = await other.newPage();
  await signInOk(page2, "CS-002");
  await expect(page2.getByTestId("space-backdrop")).toHaveAttribute("data-environment", "lunar");
  await other.close();
  await context.close();
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

test("every page has an Instructions popup", async ({ page }) => {
  for (const [slug, title] of TABS) {
    await page.goto(slug === "overview" ? "/dashboard" : `/dashboard/${slug}`);
    await page.getByTestId("instructions-header").click();
    const dialog = page.getByTestId("instructions-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: `How to use ${title}` })).toBeVisible();
    // The Normal / Watch / Escalate legend moved from the top bar into the popup.
    await expect(dialog.getByTestId("instructions-status-levels")).toContainText("Escalate");
    await dialog.getByRole("button", { name: "Got it" }).click();
    await expect(dialog).toBeHidden();
  }
});

test.describe("with reduced motion", () => {
  // The hologram floats continuously; reduced motion (honoured by the app) holds it still.
  test.use({ reducedMotion: "reduce" });

  test("hologram callout jumps to its form field", async ({ page }) => {
    await page.goto("/dashboard/vitals");
    await page.getByTestId("callout-hr").click();
    await expect(page.locator('input[name="heartRate"]')).toBeFocused();
  });
});


test("Amsler grid opens full screen and closes with Esc", async ({ page }) => {
  await page.goto("/dashboard/eyes");
  await page.getByTestId("amsler-open").click();
  const overlay = page.getByTestId("amsler-fullscreen");
  await expect(overlay).toBeVisible();
  const box = await overlay.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.width).toBeGreaterThanOrEqual(viewport.width - 1);
  expect(box!.height).toBeGreaterThanOrEqual(viewport.height - 1);
  await page.keyboard.press("Escape");
  await expect(overlay).toBeHidden();
});

test("health dashboard shows the anatomy body map, statistics and streak", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByTestId("body-map").getByRole("img", { name: "Human anatomy, front view" })).toBeVisible();
  for (const slug of ["vitals", "sleep-stress", "radiation", "bone", "eyes", "gi", "mind"]) {
    await expect(page.getByTestId(`tile-${slug}`).filter({ visible: true })).toBeVisible();
  }
  // Reference charts use NASA data from the committed fixtures.
  await expect(page.getByTestId("stat-env-dose")).toContainText("Mars transit");
  await expect(page.getByTestId("stat-env-dose")).toContainText("1.84");
  await expect(page.getByTestId("stat-space-weather")).toContainText("CMEs");
  await expect(page.getByTestId("streak-panel")).toContainText("day streak");
  await expect(page.getByTestId("streak-panel")).toContainText("check-ins in");
});

test("floating co-pilot button explains itself on hover and opens on click", async ({ page }) => {
  // The button floats; freeze motion so Playwright can hover it.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard/vitals");
  const button = page.getByTestId("copilot-button");
  await expect(button).toBeVisible();
  const tip = page.locator('[data-slot="tooltip-content"]');
  // Re-hover until hydration has attached the tooltip handlers.
  await expect(async () => {
    await page.mouse.move(0, 0);
    await button.hover();
    await expect(tip).toHaveText("Ask your mission co-pilot", { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await button.click();
  const panel = page.getByTestId("copilot-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId("copilot-suggestion").first()).toBeVisible();
  await expect(panel.getByTestId("copilot-footer")).toContainText("Decision support, not a diagnosis · Mode: offline (mock)");
});
