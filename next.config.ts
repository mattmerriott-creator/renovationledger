import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    // Server Actions default to a 1MB request body, which a single phone
    // photo already exceeds — and the photos form uploads several at once.
    // Individual files are still capped at 15MB in lib/files.ts.
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
