import type { MetadataRoute } from "next";
import { videos } from "@/lib/videos";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    ...videos.map((video) => ({
      url: `${base}/video/${video.slug}`,
      lastModified: video.publishedAt,
      priority: 0.7,
    })),
  ];
}
