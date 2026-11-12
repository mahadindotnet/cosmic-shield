import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The e2e test server builds into its own folder so it can run next to `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
