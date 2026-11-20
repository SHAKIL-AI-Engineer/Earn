import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-neon",
    "@react-pdf/renderer",
  ],
};
export default nextConfig;
