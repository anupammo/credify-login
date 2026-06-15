import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@prisma/client', 'pg'], // Required for Prisma 7 + Turbopack
};

export default nextConfig;
