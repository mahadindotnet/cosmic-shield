import { expect, test, type Page } from "@playwright/test";
import { signInOk } from "./helpers";

/** Next keeps visited routes mounted but hidden, so scope to what is on screen. */
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

const CONCERNING = "I feel hopeless and I can't cope anymore";

test("CS-001 checks in: the history row, the dashboard tile and the streak update", async ({ page }) => {
  await signInOk(page, "CS-001");
  await page.goto("/dashboard/mind");
  const rows = visible(page, "mind-history").getByTestId("mind-history-row");
  await expect(rows).toHaveCount(14); // seeded evenings, ending yesterday
  await expect(visible(page, "mind-safety-line").first()).toHaveText("If you feel unsafe or unable to cope, contact your Crew Medical Officer now.");

  const form = visible(page, "checkin-form");
  await form.getByRole("radio", { name: "Mood (1 low – 5 great): 4" }).check({ force: true });
  await form.getByRole("radio", { name: "Stress (1 calm – 5 overwhelmed): 2" }).check({ force: true });
  await form.getByRole("radio", { name: "Sleep quality (optional, 1 poor – 5 great): 3" }).check({ force: true });
  await form.getByLabel("Anything on your mind? (optional)").fill("Calm day, good call home");
  await form.getByRole("button", { name: "Log entry" }).click();

  await expect(visible(page, "checkin-result")).toContainText("Saved");
  await expect(rows).toHaveCount(15);
  await expect(rows.first()).toContainText("4/5");
  await expect(rows.first()).toContainText("Calm day, good call home");
  await expect(rows.first()).toHaveAttribute("data-status", "normal");
  await expect(visible(page, "mind-week").locator("[data-done]").last()).toBeVisible();

  await page.goto("/dashboard");
  const tile = visible(page, "tile-mind");
  await expect(tile).toHaveAttribute("data-status", "normal");
  await expect(tile).toContainText("Mood today");
  await expect(tile).toContainText("4");
  await expect(page.getByTestId("streak-panel").filter({ visible: true })).toContainText("Checked in today. Streak safe.");
});

test("a concerning message gets the caring response and an escalation the flight surgeon can read; other crew can't", async ({ browser }) => {
  // CS-002 talks to the support chat on the Mind page.
  const crew = await browser.newContext();
  const page = await crew.newPage();
  await signInOk(page, "CS-002");
  await page.goto("/dashboard/mind");
  const chat = visible(page, "mind-chat");
  await expect(chat.getByTestId("copilot-intro")).toContainText("How have you been sleeping the last few nights?");
  await expect(chat.getByTestId("mind-safety-line")).toBeVisible();

  // A normal first answer: reflection + the next question.
  await chat.getByTestId("copilot-input").fill("Not great, I keep waking up");
  await chat.getByTestId("copilot-send").click();
  await expect(chat.getByTestId("copilot-answer").last()).toContainText("How is your workload feeling at the moment?", { timeout: 30_000 });

  // The concerning message: normal flow stops, warm response, CMO now.
  await chat.getByTestId("copilot-input").fill(CONCERNING);
  await chat.getByTestId("copilot-send").click();
  const reply = chat.getByTestId("copilot-answer").last();
  await expect(reply).toHaveAttribute("data-safety", "true", { timeout: 30_000 });
  await expect(reply).toContainText("You're not alone in this.");
  await expect(reply).toContainText("Talk to your Crew Medical Officer right away.");
  await expect(reply).toContainText("ground behavioural health support");
  await expect(reply).toContainText("I can stay in this conversation with you");

  // A second concerning message gets the shorter reminder, not the full block again.
  await chat.getByTestId("copilot-input").fill("I still can't cope");
  await chat.getByTestId("copilot-send").click();
  await expect(chat.getByTestId("copilot-answer").last()).toHaveText(/I'm still here with you\..*Crew Medical Officer now\./, { timeout: 30_000 });
  await crew.close();

  // The flight surgeon sees the escalation with the excerpt on Crew admin, but no normal chat text beyond it.
  const surgeon = await browser.newContext();
  const fs = await surgeon.newPage();
  await signInOk(fs, "FS-001");
  await fs.goto("/dashboard/admin?crew=CS-002");
  const record = fs.locator('[data-testid="admin-escalation"][data-rule="mind_safety"]');
  await expect(record.first()).toBeVisible();
  await expect(record.first().getByTestId("admin-escalation-excerpt")).toContainText(CONCERNING);
  await expect(fs.getByTestId("admin-checkins")).toContainText("notes are private");
  await surgeon.close();

  // Another crew member can't reach the record (Crew admin redirects crew away).
  const other = await browser.newContext();
  const p3 = await other.newPage();
  await signInOk(p3, "CS-001");
  await p3.goto("/dashboard/admin?crew=CS-002");
  await expect(p3).toHaveURL(/\/dashboard\?denied=admin$/);
  await expect(p3.getByText(CONCERNING)).toHaveCount(0);
  await other.close();
});
