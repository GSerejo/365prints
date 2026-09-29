import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoCard } from "@/components/VideoCard";
import { WatchLinks } from "@/components/WatchLinks";
import { formatDuration, getVideo, relatedVideos, toSearchable, videos } from "@/lib/videos";

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
    openGraph: { title, images: video.thumbnail ? [video.thumbnail] : [] },
  };
}

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" });

export default async function VideoPage({ params }: PageProps<"/video/[slug]">) {
  const video = getVideo((await params).slug);
  if (!video) notFound();
  const related = relatedVideos(video);
  const primaryLink = video.links.tiktok ?? video.links.instagram;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/" className="text-sm text-muted hover:text-accent">
        ← Voltar para a busca
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]">
        <a
          href={primaryLink}
          target="_blank"
          rel="noopener"
          className="group relative block aspect-[9/16] overflow-hidden rounded-2xl bg-line"
          aria-label="Assistir ao vídeo"
        >
          {video.thumbnail ? (
            <Image src={video.thumbnail} alt="" fill priority sizes="320px" className="object-cover" />
          ) : (
            <span aria-hidden className="absolute inset-0 grid place-items-center bg-accent-soft text-6xl font-bold text-accent">
              {video.day ?? "365"}
            </span>
          )}
          <span className="absolute inset-0 grid place-items-center bg-black/10 transition group-hover:bg-black/25">
            <span className="grid size-16 place-items-center rounded-full bg-white/90 text-black shadow-lg">
              <svg viewBox="0 0 24 24" className="ml-1 size-7" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </a>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            {video.day && (
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-semibold text-accent">
                Dia {video.day} de 365
              </span>
            )}
            {video.category !== "Outros" && (
              <Link href={`/?categoria=${encodeURIComponent(video.category)}`} className="hover:text-accent">
                {video.category}
              </Link>
            )}
            <span>{dateFormat.format(new Date(video.publishedAt))}</span>
            {video.durationSec > 0 && <span>{formatDuration(video.durationSec)}</span>}
          </div>

          <h1 className="mt-3 text-balance text-2xl font-bold tracking-tight sm:text-3xl">{video.title}</h1>
          {video.summary && <p className="mt-3 max-w-prose text-pretty leading-relaxed">{video.summary}</p>}

          <div className="mt-5">
            <WatchLinks video={video} source="detail" size="lg" />
          </div>

          {video.tags.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {video.tags.map((tag) => (
                <li key={tag}>
                  <Link
                    href={`/?q=${encodeURIComponent(tag)}`}
                    className="rounded-full border border-line px-3 py-1 text-sm text-muted hover:border-accent hover:text-accent"
                  >
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {video.segments.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">O que é dito no vídeo</h2>
              <ol className="mt-3 space-y-2 border-l-2 border-line pl-4">
                {video.segments.map((segment) => (
                  <li key={segment.start} className="grid grid-cols-[3rem_1fr] gap-2 text-sm leading-relaxed">
                    <span className="font-mono text-xs leading-6 text-muted">{formatDuration(segment.start)}</span>
                    <span>{segment.text}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14 border-t border-line pt-8">
          <h2 className="text-lg font-semibold">Vídeos relacionados</h2>
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
