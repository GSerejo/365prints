import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalog } from "@/components/Catalog";
import { CatalogFromUrl } from "@/components/CatalogFromUrl";
import { toSearchable, videos } from "@/lib/videos";

export const metadata: Metadata = {
  title: "Todos os vídeos",
  description:
    "Busque nos vídeos do quadro “365 dias de impressão 3D” do @unipedia3d pelo que é falado: PETG, warping, AMS, suportes, Bambu Studio e muito mais.",
  alternates: { canonical: "/videos" },
};

export default function VideosPage() {
  const searchable = videos.map(toSearchable);
  return (
    // O HTML estático já sai com a lista completa; a busca da URL (?q=) entra ao carregar.
    <Suspense fallback={<Catalog videos={searchable} />}>
      <CatalogFromUrl videos={searchable} />
    </Suspense>
  );
}
