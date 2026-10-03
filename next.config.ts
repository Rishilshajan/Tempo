import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Turbopack ignores the
  // stray package-lock.json in the parent home directory.
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        // Always serve the freshest service worker so PWA updates ship.
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
