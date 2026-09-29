"use client";

import { useSearchParams } from "next/navigation";
import type { SearchableVideo } from "@/lib/videos";
import { Catalog } from "./Catalog";

export function CatalogFromUrl({ videos }: { videos: SearchableVideo[] }) {
  const params = useSearchParams();
  return (
    <Catalog
      videos={videos}
      initialQuery={params.get("q") ?? ""}
      initialCategory={params.get("categoria")}
    />
  );
}
