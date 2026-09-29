import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ActivityChart } from "@/components/admin/ActivityChart";
import { BarList, Card, EmptyState, SplitBar, StatTile } from "@/components/admin/parts";
import { requireAdmin } from "@/lib/admin/session";
import { getDashboard, RANGES, type DashboardData, type Range } from "@/lib/admin/stats";
import { videos } from "@/lib/videos";
import { logout } from "./actions";

export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false },
};

const number = new Intl.NumberFormat("pt-BR");
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();

  const requested = Number((await searchParams).periodo);
  const range: Range = RANGES.find((r) => r === requested) ?? 30;
  let data: DashboardData;
  try {
    data = await getDashboard(range);
  } catch (error) {
    // Mostra o motivo em vez de derrubar a página (ex.: chave ou ID do PostHog errados).
    console.error("Falha ao consultar o PostHog", error);
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-2xl font-bold tracking-tight">Painel de uso</h1>
        <div role="alert" className="mt-5 rounded-xl border border-danger/40 px-4 py-3 text-sm">
          <p>
            <strong>Não consegui ler os dados do PostHog.</strong> Confira POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID
            e NEXT_PUBLIC_POSTHOG_REGION nas variáveis da Vercel.
          </p>
          <p className="mt-2 break-words font-mono text-xs text-muted">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      </div>
    );
  }
  const { totals, previous } = data;
  const periodLabel = `${range} dias`;
  const videoById = new Map(videos.map((video) => [video.id, video]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel de uso</h1>
          <p className="text-sm text-muted">O que as pessoas procuram e assistem no site.</p>
        </div>
        <form action={logout}>
          <button className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-accent">Sair</button>
        </form>
      </div>

      {data.demo && (
        <p className="mt-5 rounded-xl border border-series-2/40 bg-accent-soft px-4 py-3 text-sm">
          <strong>Dados de exemplo.</strong> O PostHog ainda não está conectado (POSTHOG_PERSONAL_API_KEY e
          POSTHOG_PROJECT_ID), então os números abaixo são fictícios, só para visualizar o painel.
        </p>
      )}

      <nav aria-label="Período" className="mt-6 flex gap-2">
        {RANGES.map((r) => (
          <Link
            key={r}
            href={`/admin?periodo=${r}`}
            aria-current={r === range ? "page" : undefined}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${
              r === range ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface hover:border-accent"
            }`}
          >
            {r} dias
          </Link>
        ))}
      </nav>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Visitantes" value={totals.visitors} current={totals.visitors} previous={previous.visitors} periodLabel={periodLabel} />
        <StatTile label="Buscas" value={totals.searches} current={totals.searches} previous={previous.searches} periodLabel={periodLabel} />
        <StatTile label="Cliques para assistir" value={totals.clicks} current={totals.clicks} previous={previous.clicks} periodLabel={periodLabel} />
        <StatTile
          label="Buscas sem resultado"
          value={totals.searches ? totals.noResults / totals.searches : 0}
          format="percent"
          current={totals.searches ? totals.noResults / totals.searches : 0}
          previous={previous.searches ? previous.noResults / previous.searches : 0}
          upIsGood={false}
          periodLabel={periodLabel}
        />
      </div>

      <div className="mt-4">
        <ActivityChart data={data.daily} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Mais buscados" subtitle="Termos digitados na busca">
          <BarList items={data.topSearches} valueLabel="buscas" />
        </Card>
        <Card title="Buscas sem resultado" subtitle="O que o público quer e ainda não tem vídeo (ideias de pauta)">
          <BarList items={data.noResultSearches} valueLabel="buscas" />
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Vídeos mais procurados" subtitle="Aberturas da página do vídeo e cliques para assistir em cada rede">
          {data.topVideos.length ? (
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="pb-2 font-medium">Vídeo</th>
                    <th className="pb-2 text-right font-medium">Aberturas</th>
                    <th className="pb-2 text-right font-medium">TikTok</th>
                    <th className="pb-2 text-right font-medium">Instagram</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {data.topVideos.map((row) => {
                    const video = videoById.get(row.id);
                    return (
                      <tr key={row.id} className="border-t border-line">
                        <td className="py-2">
                          <div className="flex items-center gap-3">
                            {video?.thumbnail && (
                              <Image src={video.thumbnail} alt="" width={28} height={50} className="h-[50px] w-7 rounded object-cover" />
                            )}
                            {video ? (
                              <Link href={`/video/${video.slug}`} className="line-clamp-2 hover:text-accent">
                                {video.day && <span className="text-muted">Dia {video.day} · </span>}
                                {video.title}
                              </Link>
                            ) : (
                              <span className="text-muted">{row.id}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 text-right">{number.format(row.opens)}</td>
                        <td className="py-2 text-right">{number.format(row.tiktok)}</td>
                        <td className="py-2 text-right">{number.format(row.instagram)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState>Nenhum vídeo aberto neste período.</EmptyState>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Para onde vão os cliques" subtitle="Rede escolhida para assistir">
          <SplitBar
            items={[
              { label: "TikTok", value: totals.tiktok },
              { label: "Instagram", value: totals.instagram },
            ]}
          />
        </Card>
        <Card title="Aparelho" subtitle="Visitantes por tipo de aparelho">
          <SplitBar items={data.devices} />
        </Card>
        <Card title="Categorias mais filtradas">
          <BarList items={data.categories} valueLabel="filtros" />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="De onde vêm os visitantes" subtitle="Origem da visita (link da bio, Google, WhatsApp…)">
          <BarList items={data.sources} valueLabel="visitantes" />
        </Card>
        <Card title="Sugestões enviadas" subtitle={`${number.format(totals.requests)} no período, pelo formulário "não achei"`}>
          {data.requests.length ? (
            <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {data.requests.map((request) => (
                <li key={`${request.at}-${request.text}`} className="border-b border-line pb-3 last:border-0">
                  <p className="text-sm">{request.text}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {dateTime.format(new Date(request.at))}
                    {request.query && <> · buscou “{request.query}”</>}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>Nenhuma sugestão neste período.</EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}
