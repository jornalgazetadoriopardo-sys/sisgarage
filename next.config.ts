import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // geração de PDF roda no Node, fora do bundle
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    serverActions: { bodySizeLimit: "40mb" },
  },
};

export default nextConfig;
