import { TOTAL_DAYS } from "./site";
import { videos } from "./videos";

export { TOTAL_DAYS };

/** O mínimo de cada dia que a página inicial precisa no navegador. */
export type DayEntry = {
  id: string;
  day: number;
  slug: string;
  title: string;
  category: string;
  thumbnail: string | null;
  publishedAt: string;
};

/** Último dia publicado. */
export const currentDay = Math.max(0, ...videos.map((video) => video.day ?? 0));

/** Um item por dia (1 até o dia atual); `null` se algum dia ficou sem vídeo. */
export function seriesDays(): (DayEntry | null)[] {
  const byDay = new Map<number, DayEntry>();
  for (const video of videos.toSorted((a, b) => a.publishedAt.localeCompare(b.publishedAt))) {
    if (!video.day || byDay.has(video.day)) continue;
    const { id, day, slug, title, category, thumbnail, publishedAt } = video;
    byDay.set(day, { id, day, slug, title, category, thumbnail, publishedAt });
  }
  return Array.from({ length: currentDay }, (_, index) => byDay.get(index + 1) ?? null);
}

export function seriesStats() {
  return {
    videos: videos.length,
    days: currentDay,
    hours: videos.reduce((sum, video) => sum + video.durationSec, 0) / 3600,
    words: videos.reduce((sum, video) => sum + video.transcript.split(/\s+/).filter(Boolean).length, 0),
    lastPublishedAt: videos.reduce((last, video) => (video.publishedAt > last ? video.publishedAt : last), ""),
  };
}

export function categoryCounts() {
  const counts = new Map<string, number>();
  for (const video of videos) counts.set(video.category, (counts.get(video.category) ?? 0) + 1);
  return [...counts].filter(([name]) => name !== "Outros").sort((a, b) => b[1] - a[1]);
}

export function popularTags(limit = 8) {
  const counts = new Map<string, number>();
  for (const video of videos) for (const tag of video.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([tag]) => tag);
}
