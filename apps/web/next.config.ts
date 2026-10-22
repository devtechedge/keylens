import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript entrypoints; compile them through Next.
  transpilePackages: [
    "@keylens/core",
    "@keylens/db",
    "@keylens/connectors",
    "@keylens/anomaly",
    "@keylens/rotation",
    "@keylens/alerts",
  ],
  // Native pieces used by @keylens/db (libsql platform binary).
  serverExternalPackages: ["@libsql/client"],
};

export default nextConfig;
