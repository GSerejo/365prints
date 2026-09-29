import { Suspense } from "react";
import { Catalog } from "@/components/Catalog";
import { CatalogFromUrl } from "@/components/CatalogFromUrl";
import { toSearchable, videos } from "@/lib/videos";

export default function Home() {
  const searchable = videos.map(toSearchable);
  return (
    // O HTML estático já sai com a lista completa; a busca da URL (?q=) entra ao carregar.
    <Suspense fallback={<Catalog videos={searchable} />}>
      <CatalogFromUrl videos={searchable} />
    </Suspense>
  );
}
