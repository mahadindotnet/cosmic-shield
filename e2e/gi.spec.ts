import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { pick, signInOk } from "./helpers";

/**
 * GI end to end, as CS-003 (14 seeded daily entries ending yesterday, types
 * 3–5). Serial: the second test builds on the first one's entries.
 */

const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });
const yesterday = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

test.describe.configure({ mode: "serial" });

test("manual entries: history, status cards, a Watch pattern, the dashboard tile and the alert", async ({ page }) => {
  await signInOk(page, "CS-003");
  await page.goto("/dashboard/gi");
  const rows = visible(page, "gi-history").getByTestId("gi-history-row");
  await expect(rows).toHaveCount(14);
  await expect(visible(page, "gi-status-cards")).toContainText("Bristol Stool Form Scale (Lewis & Heaton 1997)");

  // No type chosen: rejected, nothing saved.
  const form = visible(page, "gi-form");
  await form.getByRole("button", { name: "Log entry" }).click();
  await expect(visible(page, "entry-bristolType-error")).toHaveText("Choose the Bristol type (1–7).");
  await expect(rows).toHaveCount(14);

  // Today: type 1 with fluid and a note.
  await pick(form.getByLabel("Bristol type: 1"));
  await form.getByLabel("Fluids").fill("1.2");
  await form.getByLabel("Note (optional)").fill("Long EVA prep day");
  await form.getByRole("button", { name: "Log entry" }).click();
  await expect(visible(page, "gi-result")).toHaveText("Saved: Bristol type 1.");
  await expect(rows).toHaveCount(15);
  await expect(rows.first()).toContainText("Separate hard lumps, like nuts (hard to pass)");
  await expect(rows.first()).toContainText("1.2 L");
  await expect(rows.first()).toContainText("Long EVA prep day");
  await expect(rows.first()).toContainText("Logged");
  const cards = visible(page, "gi-status-cards");
  await expect(cards.locator('[data-slot="card"]').filter({ hasText: "Fluids today" })).toContainText("1.2");
  await expect(cards.locator('[data-slot="card"]').filter({ hasText: "Last 3 days" })).toHaveAttribute("data-status", "normal");

  // Yesterday: type 2. Two of the last three days with types 1–2: gi_hard (Watch).
  await pick(form.getByLabel("Bristol type: 2"));
  await form.getByLabel("Day").fill(yesterday());
  await form.getByRole("button", { name: "Log entry" }).click();
  await expect(visible(page, "gi-result")).toHaveText("Saved: Bristol type 2.");
  await expect(rows).toHaveCount(16);
  const pattern = cards.locator('[data-slot="card"]').filter({ hasText: "Last 3 days" });
  await expect(pattern).toHaveAttribute("data-status", "watch");
  await expect(pattern.getByTestId("gi-reason-hard")).toHaveText(
    "Possible dehydration / constipation pattern: types 1–2 on 2 of the last 3 days. Increase fluids and fibre.",
  );
  // Advice, never a diagnosis or a clinical label.
  await expect(cards).not.toContainText(/you have|diagnosed|diarrh/i);

  await page.goto("/dashboard");
  const tile = visible(page, "tile-gi");
  await expect(tile).toHaveAttribute("data-status", "watch");
  await expect(tile).toContainText("Bristol type (latest)");
  await expect(tile).toContainText("1");
  // The bell lists every active alert (the dashboard card shows only the first few).
  await page.getByTestId("notification-bell").click();
  const item = page.getByTestId("notification-panel").locator('[data-testid="notification-item"][data-key^="alert:gi_hard:"]');
  await expect(item).toContainText("GI: possible dehydration / constipation pattern");
});

test("photo upload: stored without EXIF, labelled 'Not analysed: prototype', visible only to the owner and the flight surgeon", async ({ page, browser, playwright, baseURL }) => {
  await signInOk(page, "CS-003");
  await page.goto("/dashboard/gi");
  const rows = visible(page, "gi-history").getByTestId("gi-history-row");
  await expect(rows).toHaveCount(16);
  const form = visible(page, "gi-form");

  // Not an image (whatever the name and type say): rejected on the server, nothing saved.
  await pick(form.getByLabel("Bristol type: 4"));
  await form.getByLabel("Photo (optional)").setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from("%PDF-1.7 not a photo") });
  await form.getByRole("button", { name: "Log entry" }).click();
  await expect(visible(page, "entry-photo-error")).toHaveText("Only JPEG, PNG or WebP images can be uploaded.");
  await expect(rows).toHaveCount(16);

  // A real JPEG carrying EXIF (camera model, a location note).
  const jpeg = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#7a5" } })
    .jpeg()
    .withExif({ IFD0: { Make: "TestCam", Model: "Secret-Model", Copyright: "GPS 51.5N 0.1W" } })
    .toBuffer();
  expect((await sharp(jpeg).metadata()).exif).toBeDefined();
  await pick(form.getByLabel("Bristol type: 4"));
  await form.getByLabel("Photo (optional)").setInputFiles({ name: "stool.jpg", mimeType: "image/jpeg", buffer: jpeg });
  await form.getByRole("button", { name: "Log entry" }).click();
  await expect(visible(page, "gi-result")).toHaveText("Saved: Bristol type 4. Photo stored · Not analysed: prototype.");
  await expect(rows).toHaveCount(17);
  await expect(rows.first().getByTestId("gi-photo-label")).toHaveText("Not analysed: prototype");
  const href = await rows.first().getByTestId("gi-photo-link").getAttribute("href");
  expect(href).toMatch(/^\/api\/photos\/gi\/\d+$/);

  // The owner gets the photo, with its metadata removed.
  const own = await page.request.get(href!);
  expect(own.status()).toBe(200);
  expect(own.headers()["content-type"]).toBe("image/jpeg");
  expect(own.headers()["cache-control"]).toContain("no-store");
  const served = await own.body();
  expect((await sharp(served).metadata()).exif).toBeUndefined();
  expect(served.includes(Buffer.from("Secret-Model"))).toBe(false);

  // Another crew member: not found (the route doesn't reveal that it exists).
  const otherCtx = await browser.newContext();
  const other = await otherCtx.newPage();
  await signInOk(other, "CS-001");
  const denied = await other.request.get(href!);
  expect(denied.status()).toBe(404);
  expect((await denied.body()).includes(served.subarray(0, 64))).toBe(false);
  await otherCtx.close();

  // The flight surgeon may view it.
  const surgeonCtx = await browser.newContext();
  const surgeon = await surgeonCtx.newPage();
  await signInOk(surgeon, "FS-001");
  const fs = await surgeon.request.get(href!);
  expect(fs.status()).toBe(200);
  expect(fs.headers()["content-type"]).toBe("image/jpeg");
  await surgeonCtx.close();

  // Signed out: 401.
  const anon = await playwright.request.newContext({ baseURL });
  expect((await anon.get(href!)).status()).toBe(401);
  await anon.dispose();

  // The old classifier endpoint is a stub too: never a type, never a status.
  const stub = await page.request.post("/api/vision/bristol");
  expect(await stub.json()).toEqual({ analysed: false, status: "not_analysed", label: "Not analysed: prototype", bristolType: null });
});
