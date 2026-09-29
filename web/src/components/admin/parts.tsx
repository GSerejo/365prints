import type { ReactNode } from "react";
import type { Ranked } from "@/lib/admin/stats";

const number = new Intl.NumberFormat("pt-BR");
const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });

export function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}

/**
 * Número de destaque com variação em relação ao período anterior.
 * `upIsGood=false` para métricas em que subir é ruim (ex.: buscas sem resultado).
 */
export function StatTile({
  label,
  value,
  format = "number",
  current,
  previous,
  upIsGood = true,
  periodLabel,
}: {
  label: string;
  value: number;
  format?: "number" | "percent";
  current?: number;
  previous?: number;
  upIsGood?: boolean;
  periodLabel: string;
}) {
  const change = current !== undefined && previous ? (current - previous) / previous : null;
  const good = change !== null && (change >= 0) === upIsGood;
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">
        {format === "percent" ? percent.format(value) : value >= 10000 ? compact.format(value) : number.format(value)}
      </p>
      {change !== null && Math.abs(change) >= 0.005 ? (
        <p className={`mt-1 text-xs ${good ? "text-delta-good" : "text-delta-bad"}`}>
          <span aria-hidden>{change > 0 ? "▲" : "▼"}</span> {change > 0 ? "+" : "−"}
          {percent.format(Math.abs(change))}{" "}
          <span className="text-muted">vs {periodLabel} anteriores</span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted">{previous ? `estável vs ${periodLabel} anteriores` : "sem período anterior"}</p>
      )}
    </div>
  );
}

/** Ranking com barra horizontal (uma única série: sempre a mesma cor). */
export function BarList({ items, valueLabel }: { items: Ranked[]; valueLabel: string }) {
  if (!items.length) return <EmptyState>Nada registrado neste período.</EmptyState>;
  const max = Math.max(...items.map((item) => item.value));
  return (
    <ol className="space-y-2.5">
      {items.map((item) => (
        <li
          key={item.label}
          className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"
          title={`${item.label}: ${number.format(item.value)} ${valueLabel}`}
        >
          <span className="truncate text-sm">{item.label}</span>
          <span className="text-sm font-medium tabular-nums">{number.format(item.value)}</span>
          <span className="col-span-2 h-2 overflow-hidden rounded-full bg-grid/60">
            <span
              className="block h-full rounded-r-full bg-series-1 transition-opacity group-hover:opacity-80"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Parte do todo em uma barra só (até 3 partes), com legenda e valores sempre visíveis. */
export function SplitBar({ items }: { items: Ranked[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (!total) return <EmptyState>Nada registrado neste período.</EmptyState>;
  const colors = ["bg-series-1", "bg-series-2", "bg-series-3"];
  const parts = items.slice(0, 3);
  return (
    <div>
      <div className="flex h-3 gap-0.5" role="img" aria-label={parts.map((p) => `${p.label} ${percent.format(p.value / total)}`).join(", ")}>
        {parts.map((item, i) =>
          item.value ? (
            <span
              key={item.label}
              title={`${item.label}: ${number.format(item.value)}`}
              className={`${colors[i]} first:rounded-l-full last:rounded-r-full`}
              style={{ flexGrow: item.value }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {parts.map((item, i) => (
          <li key={item.label} className="flex items-center gap-2">
            <span aria-hidden className={`size-2.5 rounded-sm ${colors[i]}`} />
            <span>{item.label}</span>
            <strong className="tabular-nums">{percent.format(item.value / total)}</strong>
            <span className="text-muted tabular-nums">({number.format(item.value)})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
