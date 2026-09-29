import MiniSearch, { type SearchResult } from "minisearch";
import type { SearchableVideo } from "./videos";

// Palavras que aparecem em quase todo vídeo e só atrapalham o ranking.
const STOPWORDS = new Set(
  (
    "a o as os de da do das dos e em no na nos nas um uma uns umas para pra por com sem que se " +
    "eu voce ele ela isso esse essa este esta aqui ai la mais muito como e ou ao aos mas ja nao " +
    "sim meu minha seu sua tem ter foi ser vai vou dia 365 impressao impressoes 3d casa"
  ).split(" "),
);

export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function processTerm(term: string) {
  const normalized = normalize(term);
  return normalized.length < 2 || STOPWORDS.has(normalized) ? null : normalized;
}

export function createIndex(videos: SearchableVideo[]) {
  const index = new MiniSearch<SearchableVideo>({
    fields: ["title", "tags", "keywords", "summary", "caption", "transcript", "category"],
    storeFields: [],
    processTerm,
    extractField: (doc, field) => {
      const value = doc[field as keyof SearchableVideo];
      return Array.isArray(value) ? value.join(" ") : String(value ?? "");
    },
    searchOptions: {
      boost: { title: 4, tags: 3, keywords: 3, category: 2, summary: 2, caption: 1.5, transcript: 1 },
      prefix: (term) => term.length > 3,
      // Tolera erros de digitação comuns ("vasora" -> "vassoura") em palavras maiores.
      fuzzy: (term) => (term.length > 4 ? 0.34 : false),
      maxFuzzy: 3,
    },
  });
  index.addAll(videos);
  return index;
}

/** "42" ou "dia 42" busca direto o dia do quadro. */
export function parseDayQuery(query: string) {
  const match = normalize(query.trim()).match(/^(?:dia\s*)?(\d{1,3})$/);
  return match ? Number(match[1]) : null;
}

export function search(index: MiniSearch<SearchableVideo>, query: string): SearchResult[] {
  // Do mais preciso ao mais tolerante: todas as palavras sem erro de digitação,
  // depois com tolerância a erros e, por último, qualquer uma das palavras.
  const exact = index.search(query, { combineWith: "AND", fuzzy: false });
  if (exact.length) return exact;
  const typoTolerant = index.search(query, { combineWith: "AND" });
  return typoTolerant.length ? typoTolerant : index.search(query, { combineWith: "OR" });
}

/** Trecho da transcrição em volta do primeiro termo encontrado, com a posição destacada. */
export function snippet(text: string, terms: string[], radius = 70) {
  if (!text || !terms.length) return null;
  // Normaliza unidade a unidade (UTF-16, como o slice) para as posições baterem com o texto
  // original mesmo com emoji.
  const plain = text
    .split("")
    .map((char) => normalize(char)[0] ?? char)
    .join("");
  let best = -1;
  let length = 0;
  for (const term of terms) {
    const at = plain.search(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    if (at !== -1 && (best === -1 || at < best)) {
      best = at;
      length = term.length;
    }
  }
  if (best === -1) return null;
  const start = Math.max(0, text.lastIndexOf(" ", Math.max(0, best - radius)) + 1);
  const endSpace = text.indexOf(" ", best + length + radius);
  const end = endSpace === -1 ? text.length : endSpace;
  // Estende o destaque até o fim da palavra (o termo pode ser só o começo dela).
  const wordEnd = text.slice(best).search(/[\s.,!?;:]|$/);
  return {
    before: (start > 0 ? "…" : "") + text.slice(start, best),
    match: text.slice(best, best + Math.max(length, wordEnd)),
    after: text.slice(best + Math.max(length, wordEnd), end) + (end < text.length ? "…" : ""),
  };
}
