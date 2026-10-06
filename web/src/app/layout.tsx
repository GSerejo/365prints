import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Logo365prints } from "@/components/Logo365prints";
import { CREATOR, CREATOR_LINKS, SITE_NAME } from "@/lib/videos";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// A mesma fonte da logo, só nos títulos grandes.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: `${SITE_NAME} · 365 dias de impressão 3D`,
    template: `%s · ${SITE_NAME}`,
  },
  description: `Encontre qualquer vídeo do quadro "365 dias de impressão 3D" do ${CREATOR}: busque pelo que é dito em cada vídeo.`,
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, locale: "pt_BR", type: "website" },
  // Código do Google Search Console (opcional), cadastrado na Vercel.
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-line">
          {/* As duas marcas lado a lado: 365prints leva à busca, unipedia3D leva ao Instagram dele. */}
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4">
            <Link href="/" aria-label={`${SITE_NAME}: página inicial`} className="text-ink">
              <Logo365prints id="logo-header" className="h-9 w-auto sm:h-10" />
            </Link>
            <span aria-hidden className="h-7 w-px bg-line" />
            <a
              href={CREATOR_LINKS.instagram}
              target="_blank"
              rel="noopener"
              aria-label={`${CREATOR} no Instagram`}
              className="transition-opacity hover:opacity-80"
            >
              <Image
                src="/brand/unipedia-escuro.png"
                alt="unipedia 3D"
                width={387}
                height={95}
                priority
                className="h-5 w-auto dark:hidden sm:h-6"
              />
              <Image
                src="/brand/unipedia-branco.png"
                alt="unipedia 3D"
                width={387}
                height={95}
                priority
                className="hidden h-5 w-auto dark:block sm:h-6"
              />
            </a>
            <nav aria-label="Principal" className="ml-auto flex items-center gap-1 text-sm font-medium">
              <Link href="/videos" className="nav-link">
                <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <span className="sr-only sm:not-sr-only">Vídeos</span>
              </Link>
              {/* Link comum: cada clique sorteia outro vídeo no servidor. */}
              <a href="/aleatorio" className="nav-link" title="Abrir um dia aleatório">
                <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
                  <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
                  <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
                  <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
                </svg>
                <span className="sr-only sm:not-sr-only">Dia aleatório</span>
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line bg-surface/60">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <Logo365prints id="logo-footer" className="h-10 w-auto text-ink" />
              <p className="mt-3 max-w-xs text-sm text-muted">
                O quadro “365 dias de impressão 3D”, um vídeo por dia, pesquisável pelo que é falado.
              </p>
            </div>
            <nav aria-label="Rodapé" className="text-sm">
              <p className="font-semibold">Navegar</p>
              <ul className="mt-2 space-y-1.5 text-muted">
                <li>
                  <Link href="/" className="hover:text-accent">
                    Início
                  </Link>
                </li>
                <li>
                  <Link href="/videos" className="hover:text-accent">
                    Todos os vídeos
                  </Link>
                </li>
                <li>
                  <a href="/aleatorio" className="hover:text-accent">
                    Dia aleatório
                  </a>
                </li>
              </ul>
            </nav>
            <div className="text-sm">
              <p className="font-semibold">Siga o {CREATOR}</p>
              <ul className="mt-2 space-y-1.5 text-muted">
                <li>
                  <a href={CREATOR_LINKS.tiktok} target="_blank" rel="noopener" className="hover:text-accent">
                    TikTok
                  </a>
                </li>
                <li>
                  <a href={CREATOR_LINKS.instagram} target="_blank" rel="noopener" className="hover:text-accent">
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mx-auto max-w-6xl space-y-2 border-t border-line px-4 py-6 text-xs leading-relaxed text-muted">
            <p>
              Projeto independente e sem fins lucrativos, feito por um fã. Todos os vídeos são de{" "}
              <strong className="text-ink">{CREATOR}</strong>. Siga no{" "}
              <a className="underline hover:text-ink" href={CREATOR_LINKS.tiktok} target="_blank" rel="noopener">
                TikTok
              </a>{" "}
              e no{" "}
              <a className="underline hover:text-ink" href={CREATOR_LINKS.instagram} target="_blank" rel="noopener">
                Instagram
              </a>
              .
            </p>
            <p>
              Usamos estatísticas anônimas de uso (o que é pesquisado e quais vídeos são abertos) só para melhorar a
              busca. Não coletamos nome, e-mail nem qualquer dado pessoal.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
