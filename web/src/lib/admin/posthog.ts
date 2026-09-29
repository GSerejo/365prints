import "server-only";

// Consulta SQL (HogQL) na API do PostHog com uma chave pessoal de leitura.
// https://posthog.com/docs/api/queries

export function isPosthogConfigured() {
  return Boolean(process.env.POSTHOG_PERSONAL_API_KEY && process.env.POSTHOG_PROJECT_ID);
}

const host = () =>
  process.env.NEXT_PUBLIC_POSTHOG_REGION === "eu" ? "https://eu.posthog.com" : "https://us.posthog.com";

export async function hogql<Row extends unknown[]>(query: string): Promise<Row[]> {
  const response = await fetch(`${host()}/api/projects/${process.env.POSTHOG_PROJECT_ID}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`PostHog respondeu ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const data = (await response.json()) as { results: Row[] };
  return data.results;
}
