import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // Server modules are tested directly in Node; the real package throws outside a server build.
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    // Unit tests only; Playwright owns e2e/*.spec.ts.
    include: ["scripts/**/*.test.ts", "lib/**/*.test.ts", "components/**/*.test.ts"],
    environment: "node",
  },
});
