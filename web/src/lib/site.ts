// Constantes e formatação sem os dados dos vídeos: podem ir para o navegador sem levar o videos.json junto.

export const SITE_NAME = "365prints";
export const CREATOR = "@unipedia3d";
export const CREATOR_LINKS = {
  tiktok: "https://www.tiktok.com/@unipedia3d",
  instagram: "https://www.instagram.com/unipedia3d/",
};
export const TOTAL_DAYS = 365;

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
