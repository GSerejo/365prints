"""Lista os reels do perfil no Instagram (link, legenda e data).

Os vídeos costumam ser os mesmos do TikTok, mas o Instagram recebe antes. Dos reels
que ainda não estão no TikTok, baixa a miniatura e o vídeo (só para transcrever).

Sem conta (o normal): lê as páginas públicas, como um visitante sem login. A página
do perfil traz os 12 posts mais recentes e a de cada reel traz legenda, data, vídeo e
miniatura: 1 acesso ao perfil + 1 por reel novo, sem usar conta nenhuma. Se ficar
mais de 12 posts sem rodar, os mais antigos não aparecem: aí use o modo com conta.

Com CONTA_SECUNDARIA: usa a sessão salva pelo instaloader (instaloader --login=CONTA ou
import_session.py) e a consulta GraphQL do Profile.get_posts(), paginando até
reencontrar reels já salvos; com --completo, relê o perfil inteiro (umas 25 páginas).
Se receber 429 ou "feedback_required" (bloqueio por atividade automatizada), para na
hora: insistir só prolonga o bloqueio.

Uso:
    uv run collect_instagram.py
    uv run collect_instagram.py CONTA_SECUNDARIA [--completo]

Código de saída 2 = bloqueado temporariamente pelo Instagram (tente horas depois).
"""

import argparse
import json
import random
import re
import sys
import time
import urllib.request
from collections.abc import Callable
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


def download_instagram_only(save: Callable[[str, Path], None], thumbs: dict[str, str], videos: dict[str, str]) -> None:
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
                save(urls[code], target)
                counts[kind] += 1
                time.sleep(random.uniform(1, 3))
    print(f"{counts['miniaturas']} miniaturas e {counts['vídeos']} vídeos baixados (reels só do Instagram)")


def save_from_cdn(url: str, target: Path) -> None:
    """Baixa do CDN do Instagram sem usar a conta (os links já vêm assinados)."""
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        target.write_bytes(response.read())


def save_reels(known: dict[str, dict], reels: list[dict]) -> None:
    new = [reel for reel in reels if reel["shortcode"] not in known]
    merged = {**known, **{reel["shortcode"]: reel for reel in reels}}
    RAW_FILE.parent.mkdir(parents=True, exist_ok=True)
    RAW_FILE.write_text(json.dumps(sorted(merged.values(), key=lambda r: r["timestamp"]), ensure_ascii=False, indent=2))
    print(f"{len(new)} reels novos, {len(merged)} no total -> {RAW_FILE.relative_to(ROOT)}")


# Cabeçalhos de uma visita normal pelo Chrome: sem eles, o Instagram devolve a página sem os dados.
PUBLIC_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "Sec-Ch-Ua": '"Chromium";v="141", "Google Chrome";v="141", "Not?A_Brand";v="8"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}
CODE_RE = re.compile(r'"code":"([A-Za-z0-9_-]{11})"')
JSON_SCRIPT_RE = re.compile(r'<script type="application/json"[^>]*>(.*?)</script>', re.S)


def public_page(path: str) -> str:
    request = urllib.request.Request(f"https://www.instagram.com/{path}", headers=PUBLIC_HEADERS)
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def find_media(page: str, code: str) -> dict | None:
    """Procura, nos JSONs embutidos na página do post, o objeto do próprio post."""
    def walk(value):
        if isinstance(value, dict):
            if value.get("code") == code and "taken_at" in value and "media_type" in value:
                return value
            values = value.values()
        elif isinstance(value, list):
            values = value
        else:
            return None
        return next((found for item in values if (found := walk(item))), None)

    for match in JSON_SCRIPT_RE.finditer(page):
        try:
            data = json.loads(match.group(1))
        except json.JSONDecodeError:
            continue
        if media := walk(data):
            return media
    return None


def collect_public(known: dict[str, dict]) -> None:
    codes = list(dict.fromkeys(CODE_RE.findall(public_page(f"{PROFILE}/"))))
    if not codes:
        sys.exit("A página pública do perfil veio sem posts. Tente: uv run collect_instagram.py CONTA_SECUNDARIA")
    fresh = [code for code in codes if code not in known]
    if known and len(fresh) == len(codes):
        print(f"Atenção: os {len(codes)} posts mais recentes são todos novos; pode haver reels mais antigos faltando "
              "(rode com a CONTA_SECUNDARIA para paginar).")

    reels: list[dict] = []
    thumbnails: dict[str, str] = {}
    video_urls: dict[str, str] = {}
    for code in fresh:
        time.sleep(random.uniform(3, 7))
        media = find_media(public_page(f"p/{code}/"), code)
        if media is None:
            print(f"  {code}: a página veio sem os dados do post; pulando")
            continue
        if reel := to_reel(media):
            reels.append(reel)
            if url := thumbnail_url(media):
                thumbnails[code] = url
            if url := video_url(media):
                video_urls[code] = url
            print(f"  {code}: {reel['caption'][:60]!r}")
    save_reels(known, reels)
    download_instagram_only(save_from_cdn, thumbnails, video_urls)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("login", nargs="?", help="conta secundária com sessão do instaloader (opcional)")
    parser.add_argument("--completo", action="store_true", help="relê o perfil inteiro (precisa da conta)")
    args = parser.parse_args()
    if args.completo and not args.login:
        parser.error("--completo precisa da CONTA_SECUNDARIA")

    known = {} if args.completo or not RAW_FILE.exists() else {
        reel["shortcode"]: reel for reel in json.loads(RAW_FILE.read_text())
    }
    if not args.login:
        collect_public(known)
        return

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

    save_reels(known, reels)
    download_instagram_only(
        lambda url, target: loader.context.get_and_write_raw(url, str(target)), thumbnails, video_urls
    )


if __name__ == "__main__":
    main()
