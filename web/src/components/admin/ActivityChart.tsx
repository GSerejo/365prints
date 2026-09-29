"use client";

import { useEffect, useRef, useState } from "react";

type Point = { date: string; visitors: number; clicks: number };

const SERIES = [
  { key: "visitors", label: "Visitantes", color: "var(--series-1)" },
  { key: "clicks", label: "Cliques para assistir", color: "var(--series-2)" },
] as const;

const HEIGHT = 240;
const PAD = { top: 12, right: 44, bottom: 28, left: 40 };
const number = new Intl.NumberFormat("pt-BR");
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" });
const parse = (date: string) => new Date(`${date}T00:00:00Z`);

/** Divisões "redondas" para o eixo Y (0, 25, 50…). */
function niceTicks(max: number, count = 4) {
  const rough = Math.max(max, 1) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough)!;
  return Array.from({ length: Math.ceil(Math.max(max, 1) / step) + 1 }, (_, i) => i * step);
}

export function ActivityChart({ data }: { data: Point[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const ticks = niceTicks(Math.max(...data.flatMap((d) => [d.visitors, d.clicks])));
  const yMax = ticks.at(-1)!;
  const plotW = Math.max(width - PAD.left - PAD.right, 10);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
  const y = (value: number) => PAD.top + plotH - (value / yMax) * plotH;
  const path = (key: (typeof SERIES)[number]["key"]) =>
    data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join("");

  const last = data.length - 1;
  // Rótulos no fim das linhas só quando não se sobrepõem; senão legenda + tooltip bastam.
  const endLabelsFit = Math.abs(y(data[last].visitors) - y(data[last].clicks)) > 14;
  const xLabels = [0, Math.floor(last / 2), last].filter((v, i, all) => all.indexOf(v) === i);

  function pick(clientX: number, rect: DOMRect) {
    const ratio = (clientX - rect.left - PAD.left) / plotW;
    setActive(Math.min(last, Math.max(0, Math.round(ratio * last))));
  }

  // A caixa fica ao lado da linha vertical (nunca em cima dos pontos) e troca de lado perto da borda.
  const TOOLTIP_W = 176;
  const tooltipLeft =
    active === null ? 0 : x(active) + 12 + TOOLTIP_W <= width ? x(active) + 12 : Math.max(x(active) - 12 - TOOLTIP_W, 0);

  return (
    <figure className="rounded-2xl border border-line bg-surface p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-semibold">Atividade por dia</h2>
        <ul className="flex gap-4 text-sm text-muted">
          {SERIES.map((series) => (
            <li key={series.key} className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: series.color }} />
              {series.label}
            </li>
          ))}
        </ul>
      </figcaption>

      <div ref={containerRef} className="relative mt-4">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Visitantes e cliques por dia. Use as setas para percorrer os dias."
          tabIndex={0}
          className="block touch-none outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          onPointerMove={(event) => pick(event.clientX, event.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((current) => current ?? last)}
          onBlur={() => setActive(null)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? last) - 1));
            if (event.key === "ArrowRight") setActive((i) => Math.min(last, (i ?? last) + 1));
          }}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(tick)}
                y2={y(tick)}
                stroke={tick === 0 ? "var(--axis)" : "var(--grid)"}
                strokeWidth={1}
              />
              <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {number.format(tick)}
              </text>
            </g>
          ))}
          {xLabels.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={HEIGHT - 8}
              textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}
              className="fill-muted text-[11px]"
            >
              {shortDate.format(parse(data[i].date))}
            </text>
          ))}

          {active !== null && (
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--axis)" strokeWidth={1} />
          )}

          {SERIES.map((series) => (
            <path
              key={series.key}
              d={path(series.key)}
              fill="none"
              stroke={series.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {SERIES.map((series) => {
            const at = active ?? last;
            return (
              <circle
                key={series.key}
                cx={x(at)}
                cy={y(data[at][series.key])}
                r={4}
                fill={series.color}
                stroke="var(--surface)"
                strokeWidth={2}
              />
            );
          })}

          {active === null &&
            endLabelsFit &&
            SERIES.map((series) => (
              <text
                key={series.key}
                x={x(last) + 8}
                y={y(data[last][series.key])}
                dy="0.32em"
                className="fill-ink text-xs font-medium"
              >
                {number.format(data[last][series.key])}
              </text>
            ))}
        </svg>

        {active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 w-44 rounded-lg border border-line bg-surface p-2.5 text-xs shadow-lg"
            style={{ left: tooltipLeft }}
          >
            <p className="text-muted">{longDate.format(parse(data[active].date))}</p>
            {SERIES.map((series) => (
              <p key={series.key} className="mt-1 flex items-center gap-2">
                <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: series.color }} />
                <strong className="text-sm text-ink">{number.format(data[active][series.key])}</strong>
                <span className="text-muted">{series.label.toLowerCase()}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted hover:text-ink">Ver em tabela</summary>
        <div className="mt-2 max-h-64 overflow-y-auto">
          <table className="w-full text-left tabular-nums">
            <thead className="text-muted">
              <tr>
                <th className="py-1 font-medium">Dia</th>
                {SERIES.map((series) => (
                  <th key={series.key} className="py-1 text-right font-medium">
                    {series.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date} className="border-t border-line">
                  <td className="py-1">{shortDate.format(parse(d.date))}</td>
                  <td className="py-1 text-right">{number.format(d.visitors)}</td>
                  <td className="py-1 text-right">{number.format(d.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
