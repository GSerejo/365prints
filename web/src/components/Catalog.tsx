"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { createIndex, normalize, parseDayQuery, search, snippet } from "@/lib/search";
import type { SearchableVideo } from "@/lib/videos";
import { CategoryIcon } from "./CategoryIcon";
import { ContentRequest } from "./ContentRequest";
import { VideoCard, type Snippet } from "./VideoCard";

const PAGE_SIZE = 30;
const TRACK_DELAY_MS = 1200;

type Sort = "desc" | "asc";

export function Catalog({
  videos,
  initialQuery = "",
  initialCategory = null,
}: {
  videos: SearchableVideo[];
  initialQuery?: string;
  initialCategory?: string | null;
}) {
  const index = useMemo(() => createIndex(videos), [videos]);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [sort, setSort] = useState<Sort>("desc");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const video of videos) counts.set(video.category, (counts.get(video.category) ?? 0) + 1);
    return [...counts].filter(([name]) => name !== "Outros").sort((a, b) => b[1] - a[1]);
  }, [videos]);

  const popularTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const video of videos) for (const tag of video.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag);
  }, [videos]);

  const trimmed = query.trim();
  const results = useMemo(() => {
    const inCategory = (video: SearchableVideo) => !category || video.category === category;
    const byId = new Map(videos.map((video) => [video.id, video]));

    if (!trimmed) {
      const list = videos.filter(inCategory);
      // `videos` já vem do dia maior para o menor.
      return (sort === "asc" ? list.toReversed() : list).map((video) => ({ video, snippet: null as Snippet }));
    }

    const day = parseDayQuery(trimmed);
    if (day !== null) {
      return videos
        .filter((video) => video.day === day && inCategory(video))
        .map((video) => ({ video, snippet: null as Snippet }));
    }

    return search(index, trimmed)
      .map((hit) => ({ hit, video: byId.get(String(hit.id))! }))
      .filter(({ video }) => inCategory(video))
      .map(({ hit, video }) => ({
        video,
        snippet: (snippet(video.transcript, hit.terms.map(normalize)) ??
          snippet(video.caption, hit.terms.map(normalize))) as Snippet,
      }));
  }, [videos, index, trimmed, category, sort]);

  // Registra a busca quando a pessoa para de digitar, e não a cada tecla.
  const lastTracked = useRef("");
  useEffect(() => {
    if (trimmed.length < 2) return;
    const timer = setTimeout(() => {
      const key = `${trimmed}|${category}`;
      if (key === lastTracked.current) return;
      lastTracked.current = key;
      track("search", { query: trimmed, results_count: results.length, category });
      if (!results.length) track("search_no_results", { query: trimmed, category });
    }, TRACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [trimmed, category, results.length]);

  // Mantém a busca na URL, para poder compartilhar o link.
  useEffect(() => {
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    if (category) params.set("categoria", category);
    const queryString = params.toString();
    window.history.replaceState(null, "", queryString ? `?${queryString}` : window.location.pathname);
  }, [trimmed, category]);

  function selectCategory(next: string | null) {
    setCategory(next);
    setLimit(PAGE_SIZE);
    track("category_selected", { category: next });
  }

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-8 sm:py-12">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {videos.length} vídeos · busca pela fala
        </p>
        <h1 className="mt-2 text-balance font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
          Todos os vídeos
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-muted">
          Busque pelo que o Uni fala em cada vídeo do quadro “365 dias de impressão 3D”. Vale errar a digitação, e
          também dá para buscar pelo número do dia (“dia 42”).
        </p>

        <label className="relative mt-6 block max-w-2xl">
          <span className="sr-only">Buscar vídeos</span>
          <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder="Ex.: warping, placa PEI, multicor…"
            autoFocus
            className="w-full rounded-2xl border border-line bg-surface py-4 pl-12 pr-4 text-base shadow-sm outline-none transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/20"
          />
        </label>

        {popularTags.length > 0 && !trimmed && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Populares:</span>
            {popularTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setQuery(tag)}
                className="rounded-full bg-accent-soft px-3 py-1 text-accent hover:opacity-80"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
            <CategoryChip active={!category} onClick={() => selectCategory(null)}>
              Todos
            </CategoryChip>
            {categories.map(([name, count]) => (
              <CategoryChip key={name} active={category === name} onClick={() => selectCategory(name)}>
                <CategoryIcon category={name} className="size-4" />
                {name} <span className="opacity-60">{count}</span>
              </CategoryChip>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-3 text-sm text-muted">
          <span aria-live="polite">
            {results.length} {results.length === 1 ? "vídeo" : "vídeos"}
          </span>
          {!trimmed && (
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              className="rounded-lg border border-line bg-surface px-2 py-1 text-ink"
              aria-label="Ordenar"
            >
              <option value="desc">Dia: maior → menor</option>
              <option value="asc">Dia: menor → maior</option>
            </select>
          )}
        </div>
      </div>

      {results.length > 0 ? (
        <>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 py-6 sm:grid-cols-3 lg:grid-cols-5">
            {results.slice(0, limit).map(({ video, snippet }) => (
              <li key={video.id}>
                <VideoCard video={video} snippet={snippet} query={trimmed} />
              </li>
            ))}
          </ul>
          {results.length > limit && (
            <div className="pb-10 text-center">
              <button
                onClick={() => setLimit((current) => current + PAGE_SIZE)}
                className="rounded-full border border-line bg-surface px-5 py-2 text-sm font-medium hover:border-accent"
              >
                Mostrar mais ({results.length - limit})
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mx-auto max-w-lg py-16 text-center">
          <p className="text-lg font-semibold">Nenhum vídeo encontrado para “{trimmed}”.</p>
          <p className="mt-1 text-sm text-muted">Tente outra palavra, ou conte o que você procurava.</p>
          <ContentRequest query={trimmed} />
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
        active ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface hover:border-accent"
      }`}
    >
      {children}
    </button>
  );
}
