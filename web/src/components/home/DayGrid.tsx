"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { track } from "@/lib/analytics";
import { TOTAL_DAYS } from "@/lib/site";
import { useSeries } from "./SeriesContext";

const CARD_WIDTH = 248;
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });

type Preview = { day: number; left: number; top: number; above: boolean };

export function DayGrid({ categories }: { categories: [string, number][] }) {
  const { days, currentDay } = useSeries();
  const [category, setCategory] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [active, setActive] = useState(currentDay);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const matching = category ? days.filter((entry) => entry?.category === category).length : currentDay;

  const cells = useMemo(() => {
    function show(day: number) {
      const cell = cellRefs.current[day];
      const wrapper = wrapperRef.current;
      if (!cell || !wrapper) return;
      const center = cell.offsetLeft + cell.offsetWidth / 2;
      const left = Math.min(Math.max(center - CARD_WIDTH / 2, 0), wrapper.clientWidth - CARD_WIDTH);
      const above = cell.offsetTop > 150;
      setPreview({ day, left, top: above ? cell.offsetTop - 10 : cell.offsetTop + cell.offsetHeight + 10, above });
    }

    // Setas andam entre os dias publicados, como numa grade (uma só parada no Tab).
    function move(event: React.KeyboardEvent, day: number) {
      const columns = gridRef.current ? getComputedStyle(gridRef.current).gridTemplateColumns.split(" ").length : 1;
      const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }[event.key];
      let next: number | undefined;
      if (step) next = day + step;
      else if (event.key === "Home") next = 1;
      else if (event.key === "End") next = currentDay;
      if (next === undefined) return;
      event.preventDefault();
      next = Math.min(Math.max(next, 1), currentDay);
      const direction = next >= day ? 1 : -1;
      while (!days[next - 1] && next > 1 && next < currentDay) next += direction;
      if (!days[next - 1]) return;
      setActive(next);
      cellRefs.current[next]?.focus();
    }

    return Array.from({ length: TOTAL_DAYS }, (_, index) => {
      const day = index + 1;
      const entry = days[index];
      if (!entry) {
        return (
          <span
            key={day}
            className={`day-cell border border-dashed ${
              day === currentDay + 1 ? "border-brand/70" : "border-line"
            } text-muted/70`}
          >
            <span className="day-number">{day}</span>
          </span>
        );
      }
      const dimmed = category !== null && entry.category !== category;
      return (
        <Link
          key={day}
          ref={(node) => {
            cellRefs.current[day] = node;
          }}
          href={`/video/${entry.slug}`}
          prefetch={false}
          tabIndex={day === active ? 0 : -1}
          aria-label={`Dia ${day}: ${entry.title}`}
          onMouseEnter={() => show(day)}
          onMouseLeave={() => setPreview(null)}
          onFocus={() => {
            setActive(day);
            show(day);
          }}
          onBlur={() => setPreview(null)}
          onKeyDown={(event) => move(event, day)}
          onClick={() => track("video_opened", { video_id: entry.id, day, query: null })}
          className={`day-cell day-printed relative text-white transition duration-200 hover:z-10 hover:scale-125 focus-visible:z-10 focus-visible:scale-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
            dimmed ? "opacity-15 saturate-0" : ""
          }`}
        >
          {day === currentDay && (
            <span aria-hidden className="absolute -inset-1 rounded-[inherit] ring-2 ring-brand motion-safe:animate-pulse" />
          )}
          <span className="day-number">{day}</span>
        </Link>
      );
    });
  }, [days, currentDay, category, active]);

  const entry = preview ? days[preview.day - 1] : null;

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <Chip active={category === null} onClick={() => setCategory(null)}>
          Todos
        </Chip>
        {categories.map(([name]) => (
          <Chip
            key={name}
            active={category === name}
            onClick={() => {
              setCategory(category === name ? null : name);
              track("category_selected", { category: name });
            }}
          >
            <CategoryIcon category={name} className="size-4" />
            {name}
          </Chip>
        ))}
      </div>

      <p className="mt-3 text-sm text-muted" aria-live="polite">
        {category ? (
          <>
            <strong className="text-ink">{matching}</strong> dias sobre {category.toLowerCase()}
          </>
        ) : (
          <>
            <strong className="text-ink">{currentDay}</strong> de {TOTAL_DAYS} dias publicados
          </>
        )}
      </p>

      <div ref={wrapperRef} className="relative mt-4">
        <div
          ref={gridRef}
          role="group"
          aria-label="Os 365 dias do quadro. Use as setas para andar entre os dias."
          className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(20,minmax(0,1fr))] sm:gap-1.5 lg:grid-cols-[repeat(30,minmax(0,1fr))]"
        >
          {cells}
        </div>

        {preview && entry && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-20 flex gap-3 rounded-2xl border border-line bg-surface p-2.5 shadow-xl"
            style={{
              width: CARD_WIDTH,
              left: preview.left,
              top: preview.top,
              transform: preview.above ? "translateY(-100%)" : undefined,
            }}
          >
            <span className="relative h-24 w-[54px] shrink-0 overflow-hidden rounded-lg bg-accent-soft">
              {entry.thumbnail && <Image src={entry.thumbnail} alt="" fill sizes="54px" className="object-cover" />}
            </span>
            <span className="min-w-0 py-0.5">
              <span className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">
                Dia {entry.day}
              </span>
              <span className="mt-0.5 line-clamp-3 text-sm font-semibold leading-snug">{entry.title}</span>
              <span className="mt-1 block text-xs text-muted">{date.format(new Date(entry.publishedAt))}</span>
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="day-printed size-3.5 rounded-[3px]" /> publicado
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3.5 rounded-[3px] ring-2 ring-brand" /> último dia
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3.5 rounded-[3px] border border-dashed border-line" /> ainda não saiu
        </span>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
        active ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-accent hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}
