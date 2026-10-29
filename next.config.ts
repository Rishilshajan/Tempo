import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/sign-in/:path*", destination: "/login/:path*", permanent: false },
      { source: "/sign-up/:path*", destination: "/signup/:path*", permanent: false },
      { source: "/forgot-password", destination: "/login", permanent: false },
      { source: "/reset-password", destination: "/login", permanent: false },
      ...["today", "my-tasks", "rolled", "calendar", "settings", "batch-triage"].map((route) => ({
        source: `/${route}`,
        destination: "/dashboard",
        permanent: false,
      })),
    ];
  },
  // Pin the workspace root to this project so Turbopack ignores the
  // stray package-lock.json in the parent home directory.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
