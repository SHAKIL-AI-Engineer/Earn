import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  outputFileTracingIncludes: { "/api/export": ["./public/fonts/*.ttf"] },
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-neon",
    "@react-pdf/renderer",
  ],
};
export default nextConfig;
