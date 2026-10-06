"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo365prints } from "@/components/Logo365prints";
import { useReducedMotion } from "@/components/useReducedMotion";
import { track } from "@/lib/analytics";
import { TOTAL_DAYS } from "@/lib/site";
import type { PrinterSceneProps } from "./PrinterScene";
import { useSeries } from "./SeriesContext";

// O three.js só carrega no navegador e depois da página pronta; se falhar, fica a logo.
const PrinterScene = dynamic(
  () =>
    import("./PrinterScene").catch(() => ({
      default: function SceneFailed({ onError }: PrinterSceneProps) {
        useEffect(onError, [onError]);
        return null;
      },
    })),
  { ssr: false },
);

const HEAT_MS = 1600;
const NOZZLE = { from: 26, to: 220 };
const BED = { from: 25, to: 65 };
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "America/Sao_Paulo" });

type Phase = "loading" | "heating" | "printing" | "fallback";

export function PrinterHero() {
  const { days, currentDay } = useSeries();
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("loading");
  const [heat, setHeat] = useState(0);
  const [day, setDay] = useState(currentDay);
  const [layer, setLayer] = useState(0);

  // Enquanto o bico "aquece", as temperaturas sobem; depois a impressão começa.
  useEffect(() => {
    if (phase !== "heating") return;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / HEAT_MS, 1);
      setHeat(1 - (1 - t) ** 2);
      if (t < 1) raf = requestAnimationFrame(step);
      else setPhase("printing");
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  function onReady() {
    if (reducedMotion) {
      setHeat(1);
      setPhase("printing");
    } else setPhase("heating");
  }

  const entry = days[day - 1] ?? null;
  const selected = (day / TOTAL_DAYS) * 100;
  const published = (currentDay / TOTAL_DAYS) * 100;
  const nozzle = Math.round(NOZZLE.from + (NOZZLE.to - NOZZLE.from) * heat);
  const bed = Math.round(BED.from + (BED.to - BED.from) * heat);
  const printingNow = phase === "printing" && layer < day;

  let status: string;
  if (phase === "fallback") status = `Dia ${currentDay} de ${TOTAL_DAYS}`;
  else if (phase === "loading") status = "Preparando a impressora";
  else if (phase === "heating") status = "Aquecendo o bico";
  else if (day < currentDay) status = `Voltando no tempo: dia ${day}`;
  else if (printingNow) status = "Imprimindo";
  else status = `Esperando o dia ${currentDay + 1}`;

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[#141110] text-white shadow-[0_30px_80px_-30px_rgba(255,117,31,0.45)] ring-1 ring-white/10">
      <div className="relative aspect-[1/1] sm:aspect-[5/4]">
        {/* Brilho de fundo, como a luz da câmara da impressora. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_75%,rgba(255,117,31,0.28),transparent_60%),radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.08),transparent_55%)]"
        />
        {phase === "fallback" ? (
          <div className="absolute inset-0 grid place-items-center p-10">
            <Logo365prints id="logo-hero-fallback" className="w-full max-w-sm" />
          </div>
        ) : (
          <PrinterScene
            progress={day / TOTAL_DAYS}
            printing={phase === "printing"}
            reducedMotion={reducedMotion}
            screenLabel={`${String(layer).padStart(3, "0")}/365`}
            onReady={onReady}
            onError={() => setPhase("fallback")}
            onLayer={setLayer}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 text-xs sm:p-5">
          <span
            aria-live="polite"
            className="inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 font-medium backdrop-blur"
          >
            <span
              aria-hidden
              className={`size-2 rounded-full ${
                phase === "printing" && printingNow
                  ? "bg-[#ff751f] motion-safe:animate-pulse"
                  : phase === "heating"
                    ? "bg-amber-300 motion-safe:animate-pulse"
                    : "bg-emerald-400"
              }`}
            />
            {status}
          </span>
          {phase !== "fallback" && (
            <dl className="grid grid-cols-[auto_auto] gap-x-2 gap-y-0.5 rounded-xl bg-black/45 px-3 py-1.5 font-mono backdrop-blur">
              <dt className="text-white/55">bico</dt>
              <dd className="text-right tabular-nums">{nozzle}°C</dd>
              <dt className="text-white/55">mesa</dt>
              <dd className="text-right tabular-nums">{bed}°C</dd>
            </dl>
          )}
        </div>
      </div>

      <div className="border-t border-white/10 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <div className="flex items-baseline justify-between font-mono text-xs text-white/60">
          <span>
            camada <span className="tabular-nums text-white">{phase === "fallback" ? day : layer}</span>/{TOTAL_DAYS}
          </span>
          <span>
            {currentDay} de {TOTAL_DAYS} dias · faltam {TOTAL_DAYS - currentDay}
          </span>
        </div>
        <label className="mt-1 block">
          <span className="sr-only">Linha do tempo do quadro: escolha um dia</span>
          <input
            type="range"
            min={1}
            max={TOTAL_DAYS}
            value={day}
            onChange={(event) => setDay(Math.min(Math.max(1, Number(event.target.value)), currentDay))}
            aria-valuetext={entry ? `Dia ${day}: ${entry.title}` : `Dia ${day}`}
            className="print-scrubber"
            style={
              {
                "--track": `linear-gradient(to right, #ff751f 0 ${selected}%, rgba(255,117,31,0.32) ${selected}% ${published}%, rgba(255,255,255,0.12) ${published}% 100%)`,
              } as React.CSSProperties
            }
          />
        </label>
        <p className="mt-0.5 text-[11px] text-white/45">Arraste: cada camada é um dia do quadro.</p>

        {entry && (
          <Link
            href={`/video/${entry.slug}`}
            onClick={() => track("video_opened", { video_id: entry.id, day: entry.day, query: null })}
            className="group mt-3 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-2 pr-3 ring-1 ring-white/10 transition hover:bg-white/10 hover:ring-[#ff751f]/60"
          >
            <span className="relative h-16 w-9 shrink-0 overflow-hidden rounded-lg bg-white/10">
              {entry.thumbnail && <Image src={entry.thumbnail} alt="" fill sizes="36px" className="object-cover" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-[11px] uppercase tracking-wider text-[#ff9a5a]">
                Dia {entry.day} · {shortDate.format(new Date(entry.publishedAt))}
              </span>
              <span className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">{entry.title}</span>
            </span>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-5 shrink-0 text-white/50 transition group-hover:translate-x-0.5 group-hover:text-[#ff9a5a]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}
