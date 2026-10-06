import Form from "next/form";
import Link from "next/link";
import { CategoryIcon } from "@/components/CategoryIcon";
import { DayGrid } from "@/components/home/DayGrid";
import { PrinterHero } from "@/components/home/PrinterHero";
import { SeriesProvider } from "@/components/home/SeriesContext";
import { VideoCard } from "@/components/VideoCard";
import { categoryCounts, currentDay, popularTags, seriesDays, seriesStats, TOTAL_DAYS } from "@/lib/series";
import { CREATOR, CREATOR_LINKS, SITE_NAME, toSearchable, videos } from "@/lib/videos";

const longDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

const STEPS = [
  {
    title: "O Uni posta o dia",
    text: "Um vídeo por dia no TikTok e no Instagram, cada um com uma dica de impressão 3D.",
  },
  {
    title: "A fala vira texto",
    text: "Cada vídeo é transcrito com o Whisper e ganha título, resumo, categoria e etiquetas.",
  },
  {
    title: "Você acha na hora",
    text: "A busca procura no que ele falou, aceita erro de digitação e mostra o trecho certo.",
  },
];

export default function HomePage() {
  const stats = seriesStats();
  const categories = categoryCounts();
  const biggestCategory = categories[0]?.[1] ?? 1;
  const tags = popularTags(7);
  const latest = videos.slice(0, 6);
  const percent = Math.round((currentDay / TOTAL_DAYS) * 100);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: "365 prints",
    url: siteUrl,
    inLanguage: "pt-BR",
    description: `Índice pesquisável do quadro "365 dias de impressão 3D" do ${CREATOR}.`,
  };

  return (
    <SeriesProvider days={seriesDays()} currentDay={currentDay}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {/* Topo: a busca e a impressora imprimindo o quadro até o dia de hoje. */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="plate-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_25%_30%,black,transparent_70%)]"
        />
        <div aria-hidden className="absolute -right-48 -top-48 size-[40rem] rounded-full bg-brand/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted shadow-sm">
              <span aria-hidden className="size-1.5 rounded-full bg-brand motion-safe:animate-pulse" />
              Dia {currentDay} de {TOTAL_DAYS} · último vídeo em {longDate.format(new Date(stats.lastPublishedAt))}
            </p>
            <h1 className="mt-5 text-balance font-display text-4xl font-extrabold leading-[1.04] tracking-tight sm:text-6xl lg:text-[3.6rem]">
              Toda dica de impressão 3D do Uni,{" "}
              <span className="relative whitespace-nowrap text-brand">
                numa busca só.
                <span
                  aria-hidden
                  className="day-printed absolute inset-x-0 -bottom-0.5 h-1.5 rounded-full opacity-40 sm:h-2"
                />
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted">
              Os vídeos do quadro “365 dias de impressão 3D” do{" "}
              <a href={CREATOR_LINKS.instagram} target="_blank" rel="noopener" className="font-semibold text-ink hover:text-accent">
                {CREATOR}
              </a>
              , pesquisáveis pelo que ele fala em cada um. Escreveu “warping”, caiu no vídeo certo.
            </p>

            <Form
              action="/videos"
              className="mt-7 flex max-w-xl items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-lg shadow-black/5 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/20"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="ml-2 size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <label htmlFor="home-search" className="sr-only">
                Buscar vídeos
              </label>
              <input
                id="home-search"
                name="q"
                type="search"
                placeholder="Ex.: PETG, warping, multicor…"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-base outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-bg transition hover:bg-brand hover:text-white"
              >
                Buscar
              </button>
            </Form>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Tem muito de:</span>
              {tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/videos?q=${encodeURIComponent(tag)}`}
                  prefetch={false}
                  className="rounded-full bg-accent-soft px-3 py-1 text-accent transition hover:bg-brand hover:text-white"
                >
                  {tag}
                </Link>
              ))}
            </div>

            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-line pt-6">
              {[
                [String(currentDay), "dias publicados"],
                [`${decimal.format(stats.hours)} h`, "de fala transcrita"],
                [`${Math.round(stats.words / 1000)} mil`, "palavras pesquisáveis"],
              ].map(([value, label]) => (
                <div key={label} className="flex flex-col-reverse">
                  <dt className="text-xs text-muted sm:text-sm">{label}</dt>
                  <dd className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <PrinterHero />
        </div>
      </section>

      {/* Os 365 dias, como um calendário de camadas. */}
      <section aria-labelledby="calendario" className="border-y border-line bg-surface/60">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent">A linha do tempo</p>
              <h2 id="calendario" className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                O quadro até agora
              </h2>
              <p className="mt-2 max-w-lg text-muted">
                Cada quadradinho é um dia. Passe o mouse para espiar o vídeo e clique para abrir.
              </p>
            </div>
            <div className="sm:text-right">
              <p className="font-display text-5xl font-extrabold tracking-tight text-brand sm:text-6xl">{percent}%</p>
              <p className="text-sm text-muted">do quadro já impresso</p>
            </div>
          </div>
          <div className="mt-8">
            <DayGrid categories={categories} />
          </div>
        </div>
      </section>

      <section aria-labelledby="recentes" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent">Saiu da mesa</p>
            <h2 id="recentes" className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Últimos dias
            </h2>
          </div>
          <Link href="/videos" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
            Ver todos os {videos.length} vídeos
            <span aria-hidden className="transition group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {latest.map((video) => (
            <li key={video.id}>
              <VideoCard video={toSearchable(video)} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="assuntos" className="mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent">Por assunto</p>
        <h2 id="assuntos" className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Escolha por onde começar
        </h2>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map(([name, count]) => (
            <li key={name}>
              <Link
                href={`/videos?categoria=${encodeURIComponent(name)}`}
                prefetch={false}
                className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg hover:shadow-brand/10"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-brand group-hover:text-white">
                  <CategoryIcon category={name} className="size-5" />
                </span>
                <span className="mt-4 text-pretty font-semibold leading-snug">{name}</span>
                <span className="mt-auto pt-3">
                  <span className="block text-sm text-muted">{count} vídeos</span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-line">
                    <span
                      className="day-printed block h-full rounded-full"
                      style={{ width: `${Math.max(8, (count / biggestCategory) * 100)}%` }}
                    />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="como-funciona" className="bg-[#141110] text-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#ff9a5a]">Como funciona</p>
            <h2 id="como-funciona" className="mt-2 text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Do vídeo até a sua busca, em três camadas
            </h2>
            <p className="mt-4 max-w-md text-pretty leading-relaxed text-white/65">
              O {SITE_NAME} é um projeto de fã, sem fins lucrativos. Os vídeos continuam no perfil do Uni: aqui fica só o
              caminho mais curto até eles. Se curtir o quadro, segue ele lá.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={CREATOR_LINKS.tiktok}
                target="_blank"
                rel="noopener"
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-[#1b0d05] transition hover:bg-[#ff8a3d]"
              >
                Seguir no TikTok
              </a>
              <a
                href={CREATOR_LINKS.instagram}
                target="_blank"
                rel="noopener"
                className="rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 ring-white/25 transition hover:bg-white/10"
              >
                Seguir no Instagram
              </a>
            </div>
          </div>

          {/* Os passos empilhados como camadas de uma peça. */}
          <ol className="space-y-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                style={{ marginLeft: `${index * 1.25}rem` }}
                className="relative rounded-2xl bg-white/[0.05] p-5 ring-1 ring-white/10"
              >
                <span aria-hidden className="day-printed absolute inset-y-3 left-0 w-1.5 rounded-r-full" />
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-sm text-[#ff9a5a]">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/65">{step.text}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </SeriesProvider>
  );
}
