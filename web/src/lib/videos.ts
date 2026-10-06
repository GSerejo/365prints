import data from "@/data/videos.json";

export type Video = {
  id: string;
  slug: string;
  day: number | null;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  keywords: string[];
  caption: string;
  transcript: string;
  segments: { start: number; text: string }[];
  publishedAt: string;
  durationSec: number;
  views: number | null;
  thumbnail: string | null;
  links: { tiktok?: string; instagram?: string };
  /** Posição no quadro: o dia, ou (para vídeos extras sem dia) logo depois do dia anterior a ele. */
  order: number;
};

/** O que a busca precisa no navegador (sem os trechos com tempo). */
export type SearchableVideo = Omit<Video, "segments">;

function withOrder(list: Omit<Video, "order">[]): Video[] {
  const numbered = list.filter((video) => video.day).toSorted((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  return list.map((video) => {
    if (video.day) return { ...video, order: video.day };
    const previous = numbered.filter((other) => other.publishedAt <= video.publishedAt).at(-1);
    return { ...video, order: (previous?.day ?? 0) + 0.5 };
  });
}

/** Do dia mais alto para o mais baixo. */
export const videos = withOrder(data as Omit<Video, "order">[]).toSorted(
  (a, b) => b.order - a.order || b.publishedAt.localeCompare(a.publishedAt),
);

export function getVideo(slug: string) {
  return videos.find((video) => video.slug === slug);
}

/** Dia anterior e próximo dia do quadro (ordem da série). */
export function neighbors(video: Video) {
  const index = videos.findIndex((other) => other.id === video.id);
  return { older: videos[index + 1] ?? null, newer: index > 0 ? videos[index - 1] : null };
}

export function toSearchable(video: Video): SearchableVideo {
  const { segments, ...searchable } = video;
  return searchable;
}

export function relatedVideos(video: Video, limit = 4) {
  const sharedTags = (other: Video) => other.tags.filter((tag) => video.tags.includes(tag)).length;
  return videos
    .filter((other) => other.id !== video.id)
    .map((other) => ({
      other,
      score: sharedTags(other) * 2 + (other.category === video.category ? 1 : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ other }) => other);
}

// Componentes do navegador importam estes de "@/lib/site", nunca daqui (aqui vem o videos.json inteiro).
export { CREATOR, CREATOR_LINKS, formatDuration, SITE_NAME } from "./site";
