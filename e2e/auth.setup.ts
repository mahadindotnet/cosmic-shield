import { test as setup } from "@playwright/test";
import { signInOk } from "./helpers";

setup("sign in as CS-001 for the dashboard tests", async ({ page }) => {
  setup.setTimeout(180_000); // first compile of the test server
  await signInOk(page, "CS-001");
  await page.context().storageState({ path: "e2e/.auth/crew.json" });
});
