import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests only; Playwright owns e2e/*.spec.ts.
    include: ["scripts/**/*.test.ts", "lib/**/*.test.ts"],
    environment: "node",
  },
});
