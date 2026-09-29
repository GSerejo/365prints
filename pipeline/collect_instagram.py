"""Lista os reels do perfil no Instagram (só link, legenda e data).

Os vídeos são os mesmos do TikTok: o Instagram entra apenas para o site oferecer
os dois links em cada vídeo. Nada é baixado.

Usa a sessão salva pelo instaloader (instaloader --login=CONTA ou import_session.py)
e a mesma consulta GraphQL do Profile.get_posts() do instaloader, mas sem passar
pelo endpoint de "informações do perfil" (web_profile_info), que é o que o
Instagram bloqueia primeiro. Se receber 429 (muitas requisições), para na hora:
insistir só prolonga o bloqueio.

Uso:
    uv run collect_instagram.py CONTA_SECUNDARIA

Código de saída 2 = bloqueado temporariamente pelo Instagram (tente horas depois).
"""

import argparse
import json
import random
import sys
import time
from pathlib import Path

import instaloader
from instaloader.exceptions import ConnectionException
from instaloader.nodeiterator import NodeIterator

PROFILE = "unipedia3d"
# Mesma consulta que o instaloader usa em Profile.get_posts() quando logado.
POSTS_DOC_ID = "7898261790222653"
PAGE_SIZE = 12

ROOT = Path(__file__).resolve().parent
RAW_FILE = ROOT / "data" / "raw" / "instagram.json"
THUMB_DIR = ROOT / ".cache" / "thumbs" / "instagram"


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


def download_missing_thumbnails(context: instaloader.InstaloaderContext, urls: dict[str, str]) -> None:
    """Baixa só as miniaturas dos reels que não existem no TikTok (os outros já têm)."""
    from build import load_enriched, load_sources  # import tardio: build lê o RAW_FILE recém-salvo

    only_instagram = [
        e["key"].removeprefix("instagram_") for e in load_sources(load_enriched())
        if e["key"].startswith("instagram_")
    ]
    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    pending = [code for code in only_instagram if code in urls and not any(THUMB_DIR.glob(f"{code}.*"))]
    for code in pending:
        context.get_and_write_raw(urls[code], str(THUMB_DIR / f"{code}.jpg"))
        time.sleep(random.uniform(1, 3))
    print(f"{len(pending)} miniaturas baixadas (reels só do Instagram)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("login", help="conta secundária com sessão salva pelo instaloader")
    args = parser.parse_args()

    loader = instaloader.Instaloader(quiet=True, max_connection_attempts=1)
    loader.load_session_from_file(args.login)

    reels: list[dict] = []
    thumbnails: dict[str, str] = {}  # URLs expiram: ficam só nesta execução
    try:
        for count, media in enumerate(iterate_media(loader.context), 1):
            if reel := to_reel(media):
                reels.append(reel)
                if url := thumbnail_url(media):
                    thumbnails[reel["shortcode"]] = url
            if count % PAGE_SIZE == 0:
                print(f"  {count} posts lidos, {len(reels)} reels...", flush=True)
                # Pausa humana antes de a próxima página ser pedida.
                time.sleep(random.uniform(4, 9))
    except ConnectionException as error:
        if "429" in str(error):
            print(f"Instagram respondeu 429. Parando; tente de novo em algumas horas. ({error})")
            sys.exit(2)
        raise

    reels.sort(key=lambda r: r["timestamp"])
    RAW_FILE.parent.mkdir(parents=True, exist_ok=True)
    RAW_FILE.write_text(json.dumps(reels, ensure_ascii=False, indent=2))
    print(f"{len(reels)} reels listados -> {RAW_FILE.relative_to(ROOT)}")
    download_missing_thumbnails(loader.context, thumbnails)


if __name__ == "__main__":
    main()
