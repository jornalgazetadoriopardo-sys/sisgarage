import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // geração de PDF roda no Node, fora do bundle
  serverExternalPackages: ["@react-pdf/renderer"],
  // fontes usadas na geração das imagens dos posts
  outputFileTracingIncludes: { "/painel/social/imagem": ["./assets/fonts/**"] },
  experimental: {
    serverActions: { bodySizeLimit: "40mb" },
  },
};

export default nextConfig;
