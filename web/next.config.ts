import type { NextConfig } from "next";

// Região da conta PostHog: "us" ou "eu".
const posthogRegion = process.env.NEXT_PUBLIC_POSTHOG_REGION === "eu" ? "eu" : "us";

const nextConfig: NextConfig = {
  // As thumbnails já saem otimizadas do pipeline (webp, 360px).
  images: { unoptimized: true },
  // O PostHog passa pelo próprio domínio para não ser bloqueado por adblock.
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: `https://${posthogRegion}-assets.i.posthog.com/static/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `https://${posthogRegion}.i.posthog.com/:path*`,
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
