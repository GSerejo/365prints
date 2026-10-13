"""Lista os reels do perfil no Instagram (link, legenda e data).

Os vídeos costumam ser os mesmos do TikTok, mas o Instagram recebe antes. Dos reels
que ainda não estão no TikTok, baixa a miniatura e o vídeo (só para transcrever).

Usa a sessão salva pelo instaloader (instaloader --login=CONTA ou import_session.py)
e a mesma consulta GraphQL do Profile.get_posts() do instaloader, mas sem passar
pelo endpoint de "informações do perfil" (web_profile_info), que é o que o
Instagram bloqueia primeiro. Se receber 429 ou "feedback_required" (bloqueio por
atividade automatizada), para na hora: insistir só prolonga o bloqueio.

Por padrão só lê o começo do perfil, até reencontrar reels já salvos (1 ou 2
páginas). Com --completo, relê o perfil inteiro (umas 25 páginas: use raramente).

Uso:
    uv run collect_instagram.py CONTA_SECUNDARIA [--completo]

Código de saída 2 = bloqueado temporariamente pelo Instagram (tente horas depois).
"""

import argparse
import json
import random
import sys
import time
from pathlib import Path

import instaloader
from instaloader.exceptions import AbortDownloadException, ConnectionException
from instaloader.nodeiterator import NodeIterator

PROFILE = "unipedia3d"
# Mesma consulta que o instaloader usa em Profile.get_posts() quando logado.
POSTS_DOC_ID = "7898261790222653"
PAGE_SIZE = 12
# Posts fixados aparecem no topo mesmo sendo antigos (no máximo 3): só para depois
# de ver tantos reels conhecidos seguidos.
KNOWN_STREAK_TO_STOP = 6

ROOT = Path(__file__).resolve().parent
RAW_FILE = ROOT / "data" / "raw" / "instagram.json"
THUMB_DIR = ROOT / ".cache" / "thumbs" / "instagram"
VIDEO_DIR = ROOT / ".cache" / "videos" / "instagram"


def iterate_media(context: instaloader.InstaloaderContext) -> NodeIterator[dict]:
    return NodeIterator(
        context=context,
        query_hash=None,
        doc_id=POSTS_DOC_ID,
        edge_extractor=lambda d: d["data"]["xdt_api__v1__feed__user_timeline_graphql_connection"],
        node_wrapper=lambda node: node,
        query_variables={
            "data": {"count": PAGE_SIZE, "include_relationship_info": True,
                     "latest_besties_reel_media": True, "latest_reel_media": True},
            "username": PROFILE,
        },
        query_referer=f"https://www.instagram.com/{PROFILE}/",
    )


def to_reel(media: dict) -> dict | None:
    if media.get("media_type") != 2:  # 2 = vídeo
        return None
    return {
        "shortcode": media["code"],
        "webpage_url": f"https://www.instagram.com/reel/{media['code']}/",
        "caption": (media.get("caption") or {}).get("text", ""),
        "timestamp": media["taken_at"],
        "duration": media.get("video_duration"),
        "view_count": media.get("play_count") or media.get("view_count"),
    }


def thumbnail_url(media: dict) -> str | None:
    candidates = (media.get("image_versions2") or {}).get("candidates") or []
    return candidates[0]["url"] if candidates else None


def video_url(media: dict) -> str | None:
    versions = media.get("video_versions") or []
    # A menor versão basta para transcrever e tirar quadros.
    return min(versions, key=lambda v: v.get("width") or 0)["url"] if versions else None


def download_instagram_only(context: instaloader.InstaloaderContext, thumbs: dict[str, str], videos: dict[str, str]) -> None:
    """Baixa miniatura e vídeo só dos reels que ainda não estão no TikTok (os outros já têm).

    O vídeo serve só para a transcrição (como no TikTok): nunca é republicado.
    """
    from build import load_enriched, load_sources  # import tardio: build lê o RAW_FILE recém-salvo

    only_instagram = [
        e["key"].removeprefix("instagram_") for e in load_sources(load_enriched())
        if e["key"].startswith("instagram_")
    ]
    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    counts = {"miniaturas": 0, "vídeos": 0}
    for code in only_instagram:
        for kind, urls, target in (
            ("miniaturas", thumbs, THUMB_DIR / f"{code}.jpg"),
            ("vídeos", videos, VIDEO_DIR / f"{code}.mp4"),
        ):
            if code in urls and not any(target.parent.glob(f"{code}.*")):
                context.get_and_write_raw(urls[code], str(target))
                counts[kind] += 1
                time.sleep(random.uniform(1, 3))
    print(f"{counts['miniaturas']} miniaturas e {counts['vídeos']} vídeos baixados (reels só do Instagram)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("login", help="conta secundária com sessão salva pelo instaloader")
    parser.add_argument("--completo", action="store_true", help="relê o perfil inteiro, não só os reels novos")
    args = parser.parse_args()

    known = {} if args.completo or not RAW_FILE.exists() else {
        reel["shortcode"]: reel for reel in json.loads(RAW_FILE.read_text())
    }

    loader = instaloader.Instaloader(quiet=True, max_connection_attempts=1)
    loader.load_session_from_file(args.login)

    reels: list[dict] = []
    thumbnails: dict[str, str] = {}  # URLs expiram: ficam só nesta execução
    video_urls: dict[str, str] = {}
    streak = 0
    try:
        for count, media in enumerate(iterate_media(loader.context), 1):
            if reel := to_reel(media):
                streak = streak + 1 if reel["shortcode"] in known else 0
                if known and streak >= KNOWN_STREAK_TO_STOP:
                    break
                reels.append(reel)
                if url := thumbnail_url(media):
                    thumbnails[reel["shortcode"]] = url
                if url := video_url(media):
                    video_urls[reel["shortcode"]] = url
            if count % PAGE_SIZE == 0:
                print(f"  {count} posts lidos, {len(reels)} reels...", flush=True)
                # Pausa humana antes de a próxima página ser pedida.
                time.sleep(random.uniform(4, 9))
    except (ConnectionException, AbortDownloadException) as error:
        if "429" in str(error) or "feedback_required" in str(error):
            print(
                "O Instagram bloqueou a conta temporariamente (429 ou feedback_required). Parando.\n"
                "Abra o Instagram nessa conta (app ou navegador) e confirme o aviso de atividade, se aparecer;\n"
                "senão, tente de novo em um dia."
            )
            sys.exit(2)
        raise

    new = [reel for reel in reels if reel["shortcode"] not in known]
    merged = {**known, **{reel["shortcode"]: reel for reel in reels}}
    reels = sorted(merged.values(), key=lambda r: r["timestamp"])
    RAW_FILE.parent.mkdir(parents=True, exist_ok=True)
    RAW_FILE.write_text(json.dumps(reels, ensure_ascii=False, indent=2))
    print(f"{len(new)} reels novos, {len(reels)} no total -> {RAW_FILE.relative_to(ROOT)}")
    download_instagram_only(loader.context, thumbnails, video_urls)


if __name__ == "__main__":
    main()
