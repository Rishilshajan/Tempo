import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Turbopack ignores the
  // stray package-lock.json in the parent home directory.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
