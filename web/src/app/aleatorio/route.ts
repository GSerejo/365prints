import { videos } from "@/lib/videos";

// "Dia aleatório": cada visita sorteia um vídeo.
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const video = videos[Math.floor(Math.random() * videos.length)];
  return Response.redirect(new URL(`/video/${video.slug}`, request.url), 307);
}
