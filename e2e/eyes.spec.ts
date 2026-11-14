import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { pick, signInOk } from "./helpers";

/**
 * Eyes end to end, as CS-001 (no seeded screenings). Serial: the second test
 * checks the escalation records the first one created.
 */

const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

test.describe.configure({ mode: "serial" });

async function openAmsler(page: Page) {
  const overlay = page.getByTestId("amsler-fullscreen");
  // Retry: under load the first click can land before the page is interactive.
  await expect(async () => {
    await visible(page, "amsler-start").click({ timeout: 5_000 });
    await expect(overlay).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  return overlay;
}

test("Amsler: no marks is Normal; marked cells are Watch with the bell; 2 changed tests in a row tell the flight surgeon", async ({ page }) => {
  await signInOk(page, "CS-001");
  await page.goto("/dashboard/eyes");
  const rows = visible(page, "eyes-history").getByTestId("eyes-history-row");
  await expect(rows).toHaveCount(0);
  const amslerCard = visible(page, "eyes-status-cards").locator('[data-slot="card"]').filter({ hasText: "Last Amsler test" });
  await expect(amslerCard).toHaveAttribute("data-status", "no-data");

  // Both eyes, nothing marked, centre dot seen: Normal.
  let overlay = await openAmsler(page);
  await expect(overlay.getByTestId("amsler-eye-left")).toHaveAttribute("aria-pressed", "true");
  await overlay.getByTestId("amsler-save").click();
  await expect(overlay.getByTestId("amsler-result")).toHaveText("Saved left eye: no change noticed.");
  await expect(overlay.getByTestId("amsler-eye-right")).toHaveAttribute("aria-pressed", "true");
  await overlay.getByTestId("amsler-save").click();
  await expect(overlay.getByTestId("amsler-result")).toHaveText("Saved right eye: no change noticed.");
  await overlay.getByRole("button", { name: "Done" }).click();
  await expect(overlay).toBeHidden();
  await expect(rows).toHaveCount(2);
  await expect(amslerCard).toHaveAttribute("data-status", "normal");
  await expect(rows.first().getByTestId("amsler-mini")).toHaveAttribute("data-marked", "0");

  // Right eye: three squares look wavy. Watch.
  overlay = await openAmsler(page);
  await overlay.getByTestId("amsler-eye-right").click();
  for (const cell of ["8-11", "9-11", "9-12"]) await overlay.locator(`[data-cell="${cell}"]`).click();
  await overlay.locator('[data-cell="9-12"]').click(); // unmark…
  await overlay.locator('[data-cell="9-12"]').click(); // …and mark again
  await expect(overlay.getByTestId("amsler-count")).toHaveText("3 squares marked");
  await overlay.getByLabel("Note (optional)").fill("lines bent right of the dot");
  await overlay.getByTestId("amsler-save").click();
  await expect(overlay.getByTestId("amsler-result")).toHaveText("Saved right eye: Vision change noticed: repeat the test tomorrow and tell your CMO.");
  await page.keyboard.press("Escape");
  await expect(overlay).toBeHidden();
  await expect(rows).toHaveCount(3);
  await expect(amslerCard).toHaveAttribute("data-status", "watch");
  await expect(visible(page, "eyes-amsler-reason")).toHaveText("Vision change noticed: repeat the test tomorrow and tell your CMO. Right eye: 3 cells marked.");
  await expect(rows.first().getByTestId("amsler-mini")).toHaveAttribute("data-marked", "3");
  await expect(rows.first()).toContainText("lines bent right of the dot");
  await expect(visible(page, "eyes-status-cards")).not.toContainText(/SANS detected|diagnos|you have/i);

  await page.goto("/dashboard");
  const tile = visible(page, "tile-eyes");
  await expect(tile).toHaveAttribute("data-status", "watch");
  await expect(tile).toContainText("3");
  await expect(visible(page, "stat-eyes-amsler")).toContainText("3 cells marked");
  await page.getByTestId("notification-bell").click();
  await expect(page.getByTestId("notification-panel").locator('[data-testid="notification-item"][data-key^="alert:eye_amsler:"]')).toContainText(
    "Eyes: vision change noticed",
  );
  await page.keyboard.press("Escape");

  // Right eye again, centre dot not seen: second changed test in a row.
  await page.goto("/dashboard/eyes");
  overlay = await openAmsler(page);
  await overlay.getByTestId("amsler-eye-right").click();
  await overlay.getByLabel("I couldn't see the centre dot").check();
  await overlay.getByTestId("amsler-save").click();
  await expect(overlay.getByTestId("amsler-result")).toContainText("Changes on 2 tests in a row: the flight surgeon has been told.");
});

test("fundus photo: saved as a prototype, flagged for ground review; the flight surgeon sees it, other crew get 404", async ({ page, browser }) => {
  await signInOk(page, "CS-001");
  await page.goto("/dashboard/eyes");
  const rows = visible(page, "eyes-history").getByTestId("eyes-history-row");
  await expect(rows).toHaveCount(4);
  const form = visible(page, "fundus-form");

  // No photo: rejected.
  await pick(form.getByLabel("Eye: Left"));
  await form.getByRole("button", { name: "Save photo" }).click();
  await expect(visible(page, "entry-photo-error")).toHaveText("Choose a fundus photo (JPEG, PNG or WebP).");

  const png = await sharp({ create: { width: 48, height: 48, channels: 3, background: "#a33" } })
    .png()
    .withExif({ IFD0: { Make: "FundusCam", Model: "Secret-Model" } })
    .toBuffer();
  await pick(form.getByLabel("Eye: Left"));
  await form.getByLabel("Photo", { exact: true }).setInputFiles({ name: "fundus.png", mimeType: "image/png", buffer: png });
  await form.getByLabel(/Flag for ground review/).check();
  await form.getByRole("button", { name: "Save photo" }).click();
  await expect(visible(page, "fundus-result")).toHaveText(
    "Saved left eye photo · Not analysed: prototype. Flagged for ground review: the flight surgeon has been told.",
  );
  await expect(rows).toHaveCount(5);
  const photoRow = rows.first();
  await expect(photoRow).toHaveAttribute("data-kind", "fundus");
  await expect(photoRow.getByTestId("eyes-photo-label")).toHaveText("Not analysed: prototype");
  await expect(photoRow.getByTestId("eyes-flagged")).toHaveText("Flagged for ground review");
  const href = (await photoRow.getByTestId("eyes-photo-link").getAttribute("href"))!;
  expect(href).toMatch(/^\/api\/photos\/eye\/\d+$/);
  await expect(visible(page, "eyes-status-cards").locator('[data-slot="card"]').filter({ hasText: "Last fundus photo" })).toContainText(
    "Left eye · Not analysed: prototype · flagged for ground review",
  );

  const own = await page.request.get(href);
  expect(own.status()).toBe(200);
  expect(own.headers()["content-type"]).toBe("image/png");
  expect((await sharp(await own.body()).metadata()).exif).toBeUndefined();

  // Another crew member: 404.
  const otherCtx = await browser.newContext();
  const other = await otherCtx.newPage();
  await signInOk(other, "CS-002");
  expect((await other.request.get(href)).status()).toBe(404);
  await otherCtx.close();

  // The flight surgeon: both escalation records on Crew admin, and the photo.
  const surgeonCtx = await browser.newContext();
  const fs = await surgeonCtx.newPage();
  await signInOk(fs, "FS-001");
  await fs.goto("/dashboard/admin?crew=CS-001");
  const flagged = fs.locator('[data-testid="admin-escalation"][data-rule="eye_ground_review"]');
  await expect(flagged).toContainText("Eyes: fundus photo flagged for ground review");
  await expect(flagged).toContainText("Watch level, not a diagnosis.");
  await expect(flagged.getByTestId("admin-escalation-photo")).toHaveAttribute("href", href);
  await expect(fs.locator('[data-testid="admin-escalation"][data-rule="eye_amsler_repeat"]')).toContainText(
    "Vision change noticed on 2 Amsler tests in a row (right eye): 3 cells marked, then centre dot not seen.",
  );
  const surgeonPhoto = await fs.request.get(href);
  expect(surgeonPhoto.status()).toBe(200);
  await fs.getByTestId("notification-bell").click();
  await expect(fs.getByTestId("notification-panel").getByTestId("notification-item").filter({ hasText: "New escalation: CS-001" }).first()).toBeVisible();
  await surgeonCtx.close();
});
