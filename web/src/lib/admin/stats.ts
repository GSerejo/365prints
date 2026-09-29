import "server-only";
import { videos } from "@/lib/videos";
import { hogql, isPosthogConfigured } from "./posthog";

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

export type Totals = {
  visitors: number;
  searches: number;
  noResults: number;
  clicks: number;
  opens: number;
  requests: number;
  tiktok: number;
  instagram: number;
};

export type Ranked = { label: string; value: number };

export type DashboardData = {
  demo: boolean;
  range: Range;
  totals: Totals;
  previous: Pick<Totals, "visitors" | "searches" | "noResults" | "clicks">;
  daily: { date: string; visitors: number; clicks: number }[];
  topSearches: Ranked[];
  noResultSearches: Ranked[];
  topVideos: { id: string; opens: number; tiktok: number; instagram: number }[];
  sources: Ranked[];
  devices: Ranked[];
  categories: Ranked[];
  requests: { at: string; text: string; query: string | null }[];
};

const CACHE_MS = 2 * 60 * 1000;
const cache = new Map<Range, { at: number; data: DashboardData }>();

export async function getDashboard(range: Range): Promise<DashboardData> {
  if (!isPosthogConfigured()) return demoData(range);
  const hit = cache.get(range);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  const data = await queryPosthog(range);
  cache.set(range, { at: Date.now(), data });
  return data;
}

// `range` vem sempre de RANGES (número validado), nunca de texto livre.
async function queryPosthog(range: Range): Promise<DashboardData> {
  const inRange = `timestamp > now() - INTERVAL ${range} DAY`;
  const prevRange = `timestamp <= now() - INTERVAL ${range} DAY`;

  const [totalsRows, dailyRows, searchRows, noResultRows, videoRows, sourceRows, deviceRows, categoryRows, requestRows] =
    await Promise.all([
      hogql<number[]>(`
        SELECT
          uniqIf(distinct_id, event = '$pageview' AND ${inRange}),
          countIf(event = 'search' AND ${inRange}),
          countIf(event = 'search_no_results' AND ${inRange}),
          countIf(event = 'watch_click' AND ${inRange}),
          countIf(event = 'video_opened' AND ${inRange}),
          countIf(event = 'content_request' AND ${inRange}),
          countIf(event = 'watch_click' AND properties.platform = 'tiktok' AND ${inRange}),
          countIf(event = 'watch_click' AND properties.platform = 'instagram' AND ${inRange}),
          uniqIf(distinct_id, event = '$pageview' AND ${prevRange}),
          countIf(event = 'search' AND ${prevRange}),
          countIf(event = 'search_no_results' AND ${prevRange}),
          countIf(event = 'watch_click' AND ${prevRange})
        FROM events
        WHERE timestamp > now() - INTERVAL ${range * 2} DAY
          AND event IN ('$pageview', 'search', 'search_no_results', 'watch_click', 'video_opened', 'content_request')`),
      hogql<[string, number, number]>(`
        SELECT toString(toDate(timestamp)) AS day,
          uniqIf(distinct_id, event = '$pageview'),
          countIf(event = 'watch_click')
        FROM events
        WHERE ${inRange} AND event IN ('$pageview', 'watch_click')
        GROUP BY day ORDER BY day`),
      rankedQuery(`lower(trim(toString(properties.query)))`, `event = 'search' AND ${inRange}`, 15),
      rankedQuery(`lower(trim(toString(properties.query)))`, `event = 'search_no_results' AND ${inRange}`, 20),
      hogql<[string, number, number, number]>(`
        SELECT toString(properties.video_id) AS id,
          countIf(event = 'video_opened') AS opens,
          countIf(event = 'watch_click' AND properties.platform = 'tiktok') AS tiktok,
          countIf(event = 'watch_click' AND properties.platform = 'instagram') AS instagram
        FROM events
        WHERE ${inRange} AND event IN ('video_opened', 'watch_click')
        GROUP BY id ORDER BY opens + tiktok + instagram DESC LIMIT 15`),
      hogql<[string, number]>(`
        SELECT coalesce(nullIf(toString(properties.utm_source), ''), nullIf(toString(properties.$referring_domain), ''), '$direct') AS source,
          uniq(distinct_id) AS visitors
        FROM events
        WHERE event = '$pageview' AND ${inRange}
        GROUP BY source ORDER BY visitors DESC LIMIT 20`),
      hogql<[string, number]>(`
        SELECT toString(properties.$device_type) AS device, uniq(distinct_id) AS visitors
        FROM events
        WHERE event = '$pageview' AND ${inRange}
        GROUP BY device ORDER BY visitors DESC`),
      rankedQuery(`toString(properties.category)`, `event = 'category_selected' AND properties.category IS NOT NULL AND ${inRange}`, 10),
      hogql<[number, string, string | null]>(`
        SELECT toUnixTimestamp(timestamp), toString(properties.text), toString(properties.query)
        FROM events
        WHERE event = 'content_request' AND ${inRange}
        ORDER BY timestamp DESC LIMIT 50`),
    ]);

  const [t] = totalsRows;
  return {
    demo: false,
    range,
    totals: {
      visitors: t[0], searches: t[1], noResults: t[2], clicks: t[3],
      opens: t[4], requests: t[5], tiktok: t[6], instagram: t[7],
    },
    previous: { visitors: t[8], searches: t[9], noResults: t[10], clicks: t[11] },
    daily: fillDays(range, dailyRows.map(([date, visitors, clicks]) => ({ date, visitors, clicks }))),
    topSearches: searchRows,
    noResultSearches: noResultRows,
    topVideos: videoRows.map(([id, opens, tiktok, instagram]) => ({ id, opens, tiktok, instagram })),
    sources: mergeLabels(sourceRows, sourceLabel).slice(0, 8),
    devices: mergeLabels(deviceRows, deviceLabel),
    categories: categoryRows,
    requests: requestRows.map(([at, text, query]) => ({
      at: new Date(at * 1000).toISOString(),
      text,
      query: query || null,
    })),
  };
}

async function rankedQuery(expression: string, where: string, limit: number): Promise<Ranked[]> {
  const rows = await hogql<[string, number]>(`
    SELECT ${expression} AS label, count() AS value
    FROM events WHERE ${where}
    GROUP BY label HAVING label != '' ORDER BY value DESC LIMIT ${limit}`);
  return rows.map(([label, value]) => ({ label, value }));
}

function mergeLabels(rows: [string, number][], toLabel: (raw: string) => string): Ranked[] {
  const merged = new Map<string, number>();
  for (const [raw, value] of rows) {
    const label = toLabel(raw ?? "");
    merged.set(label, (merged.get(label) ?? 0) + value);
  }
  return [...merged].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function sourceLabel(raw: string) {
  const source = raw.toLowerCase();
  if (!source || source === "$direct") return "Direto (link salvo, digitado)";
  if (source.includes("instagram")) return "Instagram";
  if (source.includes("tiktok")) return "TikTok";
  if (source.includes("google")) return "Google";
  if (source.includes("whatsapp") || source === "wa.me") return "WhatsApp";
  if (source.includes("facebook") || source === "fb") return "Facebook";
  if (source.includes("youtube")) return "YouTube";
  return raw;
}

function deviceLabel(raw: string) {
  return { Mobile: "Celular", Desktop: "Computador", Tablet: "Tablet" }[raw] ?? "Outro";
}

// Mesmo fuso configurado no projeto do PostHog, para os dias baterem.
const toLocalDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format;

/** Garante um ponto por dia, mesmo nos dias sem nenhum acesso. */
function fillDays(range: Range, rows: DashboardData["daily"]) {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const days: DashboardData["daily"] = [];
  for (let offset = range - 1; offset >= 0; offset--) {
    const date = toLocalDate(new Date(Date.now() - offset * 86400000));
    days.push(byDate.get(date) ?? { date, visitors: 0, clicks: 0 });
  }
  return days;
}

/** Dados fictícios para visualizar o painel antes de conectar o PostHog. */
function demoData(range: Range): DashboardData {
  let seed = 365;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const between = (min: number, max: number) => Math.round(min + random() * (max - min));

  const daily = fillDays(range, []).map((day, i) => {
    const visitors = between(40, 90) + Math.round(i * 1.5);
    return { ...day, visitors, clicks: Math.round(visitors * (0.35 + random() * 0.2)) };
  });
  const visitors = daily.reduce((sum, day) => sum + day.visitors, 0);
  const clicks = daily.reduce((sum, day) => sum + day.clicks, 0);
  const ranked = (labels: string[], top: number) =>
    labels.map((label, i) => ({ label, value: Math.max(1, Math.round(top / (1 + i * 0.45)) - between(0, 3)) }));

  return {
    demo: true,
    range,
    totals: {
      visitors, clicks, searches: Math.round(visitors * 1.4), noResults: Math.round(visitors * 0.12),
      opens: Math.round(visitors * 0.9), requests: 7, tiktok: Math.round(clicks * 0.68),
      instagram: clicks - Math.round(clicks * 0.68),
    },
    previous: {
      visitors: Math.round(visitors * 0.82), searches: Math.round(visitors * 1.2),
      noResults: Math.round(visitors * 0.14), clicks: Math.round(clicks * 0.9),
    },
    daily,
    topSearches: ranked(
      ["warping", "placa pei", "multicor", "suporte", "bico entupido", "petg", "umidade", "tpu", "letreiro", "costura", "altura de camada", "brim"],
      180,
    ),
    noResultSearches: ranked(["resina", "ender 3", "klipper", "nylon", "cura", "voron", "impressora barulhenta"], 24),
    topVideos: videos.slice(0, 10).map((video, i) => ({
      id: video.id,
      opens: Math.round(120 / (1 + i * 0.4)),
      tiktok: Math.round(70 / (1 + i * 0.4)),
      instagram: Math.round(30 / (1 + i * 0.5)),
    })),
    sources: ranked(["Instagram", "TikTok", "Direto (link salvo, digitado)", "Google", "WhatsApp"], Math.round(visitors * 0.45)),
    devices: [
      { label: "Celular", value: Math.round(visitors * 0.78) },
      { label: "Computador", value: Math.round(visitors * 0.19) },
      { label: "Tablet", value: Math.round(visitors * 0.03) },
    ],
    categories: ranked(["Problemas e soluções", "Multicor e purga", "Acabamento e qualidade", "Suportes", "Filamentos"], 60),
    requests: [
      { at: new Date(Date.now() - 3600000).toISOString(), text: "como imprimir com resina", query: "resina" },
      { at: new Date(Date.now() - 86400000).toISOString(), text: "configurar Klipper na Ender 3", query: "klipper" },
      { at: new Date(Date.now() - 2 * 86400000).toISOString(), text: "nylon empenando muito, alguma dica?", query: "nylon" },
    ],
  };
}
