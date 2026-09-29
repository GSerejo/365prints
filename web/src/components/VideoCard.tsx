"use client";

import Image from "next/image";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { formatDuration, type SearchableVideo } from "@/lib/videos";
import { WatchLinks } from "./WatchLinks";

export type Snippet = { before: string; match: string; after: string } | null;

export function VideoCard({
  video,
  snippet,
  query,
}: {
  video: SearchableVideo;
  snippet?: Snippet;
  query?: string;
}) {
  return (
    <article className="group flex flex-col">
      <Link
        href={`/video/${video.slug}`}
        onClick={() => track("video_opened", { video_id: video.id, day: video.day, query: query || null })}
        className="flex flex-col"
      >
        <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-line">
          {video.thumbnail ? (
            <Image
              src={video.thumbnail}
              alt=""
              fill
              sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 50vw"
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <span aria-hidden className="absolute inset-0 grid place-items-center bg-accent-soft text-4xl font-bold text-accent">
              {video.day ?? "365"}
            </span>
          )}
          {video.day && (
            <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">
              Dia {video.day}
            </span>
          )}
          {video.durationSec > 0 && (
            <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-white">
              {formatDuration(video.durationSec)}
            </span>
          )}
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-accent">
          {video.title}
        </h3>
      </Link>
      {snippet ? (
        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted">
          {snippet.before}
          <mark>{snippet.match}</mark>
          {snippet.after}
        </p>
      ) : (
        video.category !== "Outros" && <p className="mt-0.5 text-xs text-muted">{video.category}</p>
      )}
      <div className="mt-2">
        <WatchLinks video={video} source="card" />
      </div>
    </article>
  );
}
