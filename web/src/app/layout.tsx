import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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

// Enquanto for surpresa, o site fica fora do Google. Para liberar: NEXT_PUBLIC_ALLOW_INDEXING=true
const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: `${SITE_NAME} · 365 dias de impressão 3D`,
    template: `%s · ${SITE_NAME}`,
  },
  description: `Encontre qualquer vídeo do quadro "365 dias de impressão 3D" do ${CREATOR}: busque pelo que é dito em cada vídeo.`,
  robots: allowIndexing ? undefined : { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span aria-hidden className="grid size-7 place-items-center rounded-md bg-accent text-xs font-bold text-accent-ink">
                365
              </span>
              {SITE_NAME}
            </Link>
            <a
              href={CREATOR_LINKS.instagram}
              target="_blank"
              rel="noopener"
              className="text-sm text-muted hover:text-ink"
            >
              {CREATOR}
            </a>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-6xl space-y-2 px-4 py-6 text-xs leading-relaxed text-muted">
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
