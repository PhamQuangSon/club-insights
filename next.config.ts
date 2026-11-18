import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module; keep it out of the server bundle.
  serverExternalPackages: ["better-sqlite3"],
  // The API reads the seeded SQLite file at runtime; ship it with the serverless functions.
  outputFileTracingIncludes: {
    "/api/**": ["./db/club-insights.db"],
  },
};

export default nextConfig;
