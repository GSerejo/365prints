import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryIcon } from "@/components/CategoryIcon";
import { DayKeys } from "@/components/DayKeys";
import { ShareButton } from "@/components/ShareButton";
import { VideoCard } from "@/components/VideoCard";
import { WatchLinks } from "@/components/WatchLinks";
import { TOTAL_DAYS } from "@/lib/series";
import {
  formatDuration,
  getVideo,
  neighbors,
  relatedVideos,
  toSearchable,
  videos,
  type Video,
} from "@/lib/videos";

export const dynamicParams = false;

export function generateStaticParams() {
  return videos.map((video) => ({ slug: video.slug }));
}

export async function generateMetadata({ params }: PageProps<"/video/[slug]">): Promise<Metadata> {
  const video = getVideo((await params).slug);
  if (!video) return {};
  const title = video.day ? `Dia ${video.day}: ${video.title}` : video.title;
  return {
    title,
    description: video.summary || video.transcript.slice(0, 160),
    alternates: { canonical: `/video/${video.slug}` },
    openGraph: { title, type: "article", images: video.thumbnail ? [video.thumbnail] : [] },
  };
}

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" });

export default async function VideoPage({ params }: PageProps<"/video/[slug]">) {
  const video = getVideo((await params).slug);
  if (!video) notFound();
  const related = relatedVideos(video);
  const { older, newer } = neighbors(video);
  const primaryLink = video.links.tiktok ?? video.links.instagram;
  const href = (other: Video | null) => (other ? `/video/${other.slug}` : null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <DayKeys older={href(older)} newer={href(newer)} />
      <nav aria-label="Você está em" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-accent">
              Início
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/videos" className="hover:text-accent">
              Vídeos
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink">
            {video.day ? `Dia ${video.day}` : "Extra"}
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-8 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] lg:gap-12">
        <div>
          <a
            href={primaryLink}
            target="_blank"
            rel="noopener"
            className="group relative block aspect-[9/16] overflow-hidden rounded-3xl bg-line shadow-2xl shadow-brand/15 ring-1 ring-black/5 dark:ring-white/10"
            aria-label="Assistir ao vídeo"
          >
            {video.thumbnail ? (
              <Image src={video.thumbnail} alt="" fill priority sizes="320px" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
            ) : (
              <span aria-hidden className="day-printed absolute inset-0 grid place-items-center font-display text-7xl font-extrabold text-white">
                {video.day ?? "365"}
              </span>
            )}
            <span className="absolute inset-0 grid place-items-center bg-gradient-to-t from-black/40 via-transparent to-transparent transition group-hover:bg-black/20">
              <span className="grid size-16 place-items-center rounded-full bg-white/90 text-black shadow-lg transition group-hover:scale-110 group-hover:bg-brand group-hover:text-white">
                <svg viewBox="0 0 24 24" className="ml-1 size-7" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          </a>
          {video.day && (
            <div className="mt-4" aria-hidden>
              <div className="flex justify-between font-mono text-[11px] text-muted">
                <span>camada {video.day}</span>
                <span>{TOTAL_DAYS}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="day-printed h-full rounded-full" style={{ width: `${(video.day / TOTAL_DAYS) * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
            {video.day && (
              <span className="rounded-full bg-brand px-2.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#1b0d05]">
                Dia {video.day} de {TOTAL_DAYS}
              </span>
            )}
            {video.category !== "Outros" && (
              <Link
                href={`/videos?categoria=${encodeURIComponent(video.category)}`}
                className="inline-flex items-center gap-1.5 hover:text-accent"
              >
                <CategoryIcon category={video.category} className="size-4" />
                {video.category}
              </Link>
            )}
            <span>{dateFormat.format(new Date(video.publishedAt))}</span>
            {video.durationSec > 0 && <span>{formatDuration(video.durationSec)}</span>}
          </div>

          <h1 className="mt-4 text-balance font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            {video.title}
          </h1>
          {video.summary && <p className="mt-4 max-w-prose text-pretty text-lg leading-relaxed text-muted">{video.summary}</p>}

          <div className="mt-6 flex flex-wrap gap-2">
            <WatchLinks video={video} source="detail" size="lg" />
            <ShareButton videoId={video.id} title={video.title} />
          </div>

          {video.tags.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {video.tags.map((tag) => (
                <li key={tag}>
                  <Link
                    href={`/videos?q=${encodeURIComponent(tag)}`}
                    prefetch={false}
                    className="rounded-full border border-line px-3 py-1 text-sm text-muted hover:border-accent hover:text-accent"
                  >
                    #{tag}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {video.segments.length > 0 && (
            <section className="mt-10 rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent">O que é dito no vídeo</h2>
              <ol className="mt-4 space-y-2.5">
                {video.segments.map((segment) => (
                  <li key={segment.start} className="grid grid-cols-[3rem_1fr] gap-2 text-sm leading-relaxed">
                    <span className="font-mono text-xs leading-6 text-accent/80">{formatDuration(segment.start)}</span>
                    <span>{segment.text}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>

      <nav aria-label="Outros dias" className="mt-12 grid gap-3 sm:grid-cols-2">
        {older ? <DayLink video={older} direction="older" /> : <span />}
        {newer && <DayLink video={newer} direction="newer" />}
      </nav>
      <p className="mt-2 hidden text-xs text-muted sm:block">Dica: as setas ← → do teclado também mudam de dia.</p>

      {related.length > 0 && (
        <section className="mt-14 border-t border-line pt-8">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Vídeos relacionados</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
            {related.map((other) => (
              <li key={other.id}>
                <VideoCard video={toSearchable(other)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function DayLink({ video, direction }: { video: Video; direction: "older" | "newer" }) {
  const newer = direction === "newer";
  return (
    <Link
      href={`/video/${video.slug}`}
      className={`group flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition hover:border-brand hover:shadow-lg hover:shadow-brand/10 ${
        newer ? "flex-row-reverse text-right" : ""
      }`}
    >
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-brand group-hover:text-white"
      >
        {newer ? "→" : "←"}
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
          {newer ? "Próximo" : "Anterior"} · {video.day ? `Dia ${video.day}` : "Extra"}
        </span>
        <span className="mt-0.5 line-clamp-1 font-semibold">{video.title}</span>
      </span>
    </Link>
  );
}
