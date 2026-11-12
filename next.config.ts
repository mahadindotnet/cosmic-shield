import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The e2e test server builds into its own folder so it can run next to `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // ...and uses its own tsconfig (tsconfig.e2e.json, which already lists
  // .next-test types), so Next.js never needs to rewrite tsconfig.json.
  typescript: { tsconfigPath: process.env.NEXT_TSCONFIG_PATH || "tsconfig.json" },
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: true,
  // Dev-only badge: kept off the sidebar footer (collapse button) and the
  // floating co-pilot button in the bottom-right corner.
  devIndicators: { position: "top-left" },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
