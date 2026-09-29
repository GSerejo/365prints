"use client";

import { track, type Platform } from "@/lib/analytics";
import type { SearchableVideo } from "@/lib/videos";

const LABELS: Record<Platform, string> = { tiktok: "TikTok", instagram: "Instagram" };

export function WatchLinks({
  video,
  source,
  size = "sm",
}: {
  video: Pick<SearchableVideo, "id" | "day" | "links">;
  source: "card" | "detail";
  size?: "sm" | "lg";
}) {
  const platforms = (Object.keys(LABELS) as Platform[]).filter((platform) => video.links[platform]);
  const style =
    size === "lg"
      ? "rounded-lg px-4 py-2.5 text-sm font-semibold first:bg-accent first:text-accent-ink border border-line first:border-accent hover:opacity-90"
      : "rounded-full border border-line px-2.5 py-0.5 text-xs text-muted hover:border-accent hover:text-accent";

  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((platform) => (
        <a
          key={platform}
          href={video.links[platform]}
          target="_blank"
          rel="noopener"
          className={style}
          onClick={() =>
            track("watch_click", { video_id: video.id, day: video.day, platform, source })
          }
        >
          {size === "lg" ? `Assistir no ${LABELS[platform]}` : LABELS[platform]}
        </a>
      ))}
    </div>
  );
}
