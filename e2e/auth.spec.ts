import { expect, test } from "@playwright/test";
import { DEMO, signIn, signInOk } from "./helpers";

const GENERIC = "Invalid crew ID or PIN";

test("signed-out visitors are sent to /login, and the API answers 401", async ({ page, request }) => {
  await page.goto("/dashboard/vitals");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fvitals$/);
  expect((await request.get("/api/crew")).status()).toBe(401);
});

test("wrong PIN and unknown crew ID give the same generic error", async ({ page }) => {
  await signIn(page, "CS-003", "111222");
  await expect(page.getByTestId("login-error")).toHaveText(GENERIC);

  await signIn(page, "CS-999", "111222");
  await expect(page.getByTestId("login-error")).toHaveText(GENERIC);

  // A correct sign-in afterwards works and resets the counter.
  await signInOk(page, "CS-003");
});

test("five wrong PINs lock the account for five minutes; the flight surgeon can unlock it", async ({ page, browser }) => {
  for (let i = 1; i <= 4; i++) {
    await signIn(page, "CS-004", "000111");
    await expect(page.getByTestId("login-error")).toHaveText(GENERIC);
  }
  await signIn(page, "CS-004", "000111");
  const locked = page.getByTestId("login-locked");
  await expect(locked).toContainText("Try again in");
  await expect(locked).toContainText(/[45]:\d\d/);

  // Even the right PIN is refused while locked.
  await signIn(page, "CS-004", DEMO["CS-004"]);
  await expect(page.getByTestId("login-locked")).toBeVisible();

  // Flight surgeon unlocks it from the admin page.
  const fs = await browser.newPage();
  await signInOk(fs, "FS-001");
  await fs.goto("/dashboard/admin");
  const row = fs.getByTestId("admin-row-CS-004");
  await expect(row.getByTestId("status-locked")).toBeVisible();
  await row.getByTestId("unlock-CS-004").click();
  await expect(row.getByTestId("status-locked")).toHaveCount(0);
  await expect(fs.getByTestId("admin-audit")).toContainText("unlocked_by_FS-001");
  await fs.close();

  await signInOk(page, "CS-004");
});

test("correct PIN entered on the on-screen keypad opens the dashboard", async ({ page }) => {
  await page.goto("/login?switch=1");
  await page.getByTestId("login-crew-id").fill("CS-002");
  const keypad = page.getByRole("group", { name: "PIN keypad" });
  for (const d of DEMO["CS-002"]) await keypad.getByRole("button", { name: d, exact: true }).click();
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
  await expect(page.getByTestId("account-crew-id")).toHaveText("CS-002");
});

test("Lock returns to the PIN screen with the crew ID pre-filled", async ({ page }) => {
  await signInOk(page, "CS-001");
  await page.getByTestId("lock-button").click();
  await expect(page).toHaveURL(/\/login\?locked=1$/);
  await expect(page.getByTestId("locked-crew-id")).toHaveText("CS-001");

  // The old session is gone.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);

  // Unlock with the PIN only.
  await page.goto("/login?locked=1");
  await page.getByTestId("login-pin").fill(DEMO["CS-001"]);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
});

test("a crew member cannot open the admin page", async ({ page }) => {
  await signInOk(page, "CS-001");
  await page.goto("/dashboard/admin");
  await expect(page).toHaveURL(/\/dashboard\?denied=admin$/);
  await expect(page.getByTestId("admin-users")).toHaveCount(0);
  // Crew can't read another crew member's data either.
  const res = await page.request.get("/api/crew/CS-002");
  expect(res.status()).toBe(403);
  expect((await page.request.get("/api/crew/CS-001")).status()).toBe(200);
});

test("Log out ends the session and forgets the crew ID", async ({ page }) => {
  await signInOk(page, "CS-003");
  await page.getByTestId("logout-button").click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("login-crew-id")).toHaveValue("");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("the flight surgeon picks a crew member to review on the Crew admin page", async ({ page }) => {
  await signInOk(page, "FS-001");
  await expect(page.getByTestId("crew-switcher")).toHaveCount(0); // not in the top bar
  await page.goto("/dashboard/admin");
  await expect(page.getByTestId("crew-review")).toContainText("Cmdr. Elena Reyes"); // first crew member by default
  await page.getByTestId("pick-CS-002").click();
  await expect(page).toHaveURL(/\/dashboard\/admin\?crew=CS-002$/);
  await expect(page.getByTestId("pick-CS-002")).toHaveAttribute("aria-current", "true");
  const review = page.getByTestId("crew-review");
  await expect(review).toContainText("Dr. Amara Okafor");
  await expect(review).toContainText("Crew Medical Officer (CMO)");
  await expect(review).toContainText("Latest readings");
});
