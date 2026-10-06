"""Junta TikTok + Instagram + transcrições + descrições e gera os dados do site.

Saídas:
    web/src/data/videos.json
    web/public/thumbs/<chave>.webp

Uso:
    uv run build.py
"""

import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

from match import SERIES_INTRO_RE, same_video, series_day, spoken_day

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
THUMB_CACHE = ROOT / ".cache" / "thumbs"
WEB = ROOT.parent / "web"
OUT_FILE = WEB / "src" / "data" / "videos.json"
OUT_THUMBS = WEB / "public" / "thumbs"

THUMB_WIDTH = 360
CATEGORIES = {
    "Coisas úteis para imprimir",
    "Personalização no fatiador",
    "Acabamento e qualidade",
    "Problemas e soluções",
    "Suportes",
    "Multicor e purga",
    "Calibração e configurações",
    "Filamentos",
    "Manutenção e upgrades",
    "Impressoras",
}


def read_json(path: Path, default=None):
    return json.loads(path.read_text()) if path.exists() else default


def clean_caption(caption: str | None) -> str:
    text = re.sub(r"#\S+", "", caption or "")
    return re.sub(r"\s+", " ", text).strip()


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:60].rstrip("-")


def first_sentence(text: str) -> str:
    text = SERIES_INTRO_RE.sub("", text).strip()
    sentence = re.split(r"(?<=[.!?])\s", text, maxsplit=1)[0]
    return sentence if len(sentence) <= 90 else sentence[:87].rsplit(" ", 1)[0] + "…"


def load_sources(enriched: dict[str, dict]) -> list[dict]:
    """Uma entrada por vídeo, com os links de cada rede onde ele aparece."""
    entries = []
    for v in read_json(DATA / "raw" / "tiktok.json", []):
        entries.append({
            "key": f"tiktok_{v['id']}",
            "caption": v["description"],
            "timestamp": v["timestamp"],
            "duration": v["duration"],
            "views": v["view_count"],
            "links": {"tiktok": v["webpage_url"]},
        })

    # Pares definidos à mão na descrição ("instagram": código do reel) têm prioridade.
    manual = {info["instagram"]: key for key, info in enriched.items() if info.get("instagram")}
    by_key = {e["key"]: e for e in entries}

    for reel in read_json(DATA / "raw" / "instagram.json", []):
        if reel["shortcode"] in manual and manual[reel["shortcode"]] in by_key:
            candidates = [by_key[manual[reel["shortcode"]]]]
        else:
            candidates = [
                e for e in entries
                if "instagram" not in e["links"] and e["key"] not in manual.values() and same_video(reel, e)
            ]
        if candidates:
            twin = min(candidates, key=lambda e: abs(e["timestamp"] - reel["timestamp"]))
            twin["links"]["instagram"] = reel["webpage_url"]
            twin["ig_caption"] = reel["caption"]
            # Data de publicação = a primeira das duas redes (o TikTok costuma vir semanas depois).
            twin["published"] = min(twin.get("published", twin["timestamp"]), reel["timestamp"])
            if len(clean_caption(reel["caption"])) > len(clean_caption(twin["caption"])):
                # Guarda a legenda curta também: às vezes só ela traz o "Dia X de 365".
                twin["alt_caption"], twin["caption"] = twin["caption"], reel["caption"]
            else:
                twin["alt_caption"] = reel["caption"]
        else:
            entries.append({
                "key": f"instagram_{reel['shortcode']}",
                "caption": reel["caption"],
                "timestamp": reel["timestamp"],
                "duration": reel["duration"],
                "views": reel["view_count"],
                "links": {"instagram": reel["webpage_url"]},
            })
    return entries


def build_thumbnail(key: str) -> str | None:
    target = OUT_THUMBS / f"{key}.webp"
    if not target.exists():
        platform, video_id = key.split("_", 1)
        sources = sorted((THUMB_CACHE / platform).glob(f"{video_id}.*"))
        if not sources:
            return None
        OUT_THUMBS.mkdir(parents=True, exist_ok=True)
        with Image.open(sources[0]) as image:
            image = image.convert("RGB")
            image.thumbnail((THUMB_WIDTH, THUMB_WIDTH * 2))
            image.save(target, "WEBP", quality=72)
    return f"/thumbs/{key}.webp"


def load_enriched() -> dict[str, dict]:
    """Descrições geradas em lotes: cada arquivo mapeia chave do vídeo -> descrição."""
    enriched = {}
    for path in sorted((DATA / "enriched").glob("*.json")):
        enriched.update(read_json(path))
    invalid = sorted(
        key for key, value in enriched.items()
        if not value.get("hidden") and value.get("category") not in CATEGORIES
    )
    if invalid:
        raise SystemExit(f"Categoria inválida em: {', '.join(invalid)}")
    return enriched


def build_video(entry: dict, enriched: dict, used_slugs: set[str]) -> dict:
    key = entry["key"]
    transcript = read_json(DATA / "transcripts" / f"{key}.json", {"text": "", "segments": []})
    caption = clean_caption(entry["caption"])
    day = (
        enriched.get("day")  # correção manual quando a legenda erra o número
        or series_day(entry["caption"])
        or series_day(entry.get("alt_caption"))
        or series_day(transcript["text"][:200])
    )

    title = (
        enriched.get("title")
        or first_sentence(caption)
        or first_sentence(transcript["text"])
        or (f"Dia {day} de 365" if day else "Vídeo sem título")
    )
    prefix = f"dia-{day}-" if day and not title.lower().startswith("dia") else ""
    base_slug = slugify(prefix + title) or key
    slug, n = base_slug, 2
    while slug in used_slugs:
        slug, n = f"{base_slug}-{n}", n + 1
    used_slugs.add(slug)

    return {
        "id": key,
        "slug": slug,
        "day": day,
        "title": title,
        "summary": enriched.get("summary") or SERIES_INTRO_RE.sub("", caption).strip(),
        "category": enriched.get("category") or "Outros",
        "tags": enriched.get("tags", []),
        "keywords": enriched.get("keywords", []),
        "caption": caption,
        "transcript": transcript["text"],
        "segments": [{"start": s["start"], "text": s["text"]} for s in transcript["segments"]],
        "publishedAt": datetime.fromtimestamp(entry.get("published", entry["timestamp"]), timezone.utc).isoformat(),
        "durationSec": round(float(entry["duration"] or 0)),
        "views": entry["views"],
        "thumbnail": build_thumbnail(key),
        "links": entry["links"],
    }


def check_pairs(entries: list[dict], enriched: dict[str, dict]) -> list[str]:
    """Avisa quando o dia falado no vídeo do TikTok não bate com o dia da legenda do Instagram.

    A legenda às vezes traz o número errado; quando isso acontece o par automático pode juntar
    vídeos diferentes. Pares definidos à mão ("instagram" na descrição) não são checados.
    """
    def spoken(entry):
        transcript = read_json(DATA / "transcripts" / f"{entry['key']}.json", {"text": ""})
        return spoken_day(transcript["text"])

    warnings = []
    only_instagram = {series_day(e["caption"]): e for e in entries if e["key"].startswith("instagram_")}
    for entry in entries:
        info = enriched.get(entry["key"], {})
        if info.get("hidden") or info.get("instagram") or not entry["key"].startswith("tiktok_"):
            continue
        day = spoken(entry)
        if day is None:
            continue
        if "instagram" in entry["links"]:
            ig_day = series_day(entry.get("ig_caption"))
            if ig_day is not None and ig_day != day:
                warnings.append(f"{entry['key']}: fala 'dia {day}', mas o par do Instagram é o dia {ig_day} ({entry['links']['instagram']})")
        elif day in only_instagram:
            warnings.append(f"{entry['key']}: fala 'dia {day}' e não tem par; o Instagram tem o dia {day} sozinho ({only_instagram[day]['key']})")
    return warnings


def main() -> None:
    used_slugs: set[str] = set()
    enriched = load_enriched()
    entries = sorted(load_sources(enriched), key=lambda e: e["timestamp"])
    for warning in check_pairs(entries, enriched):
        print("ATENÇÃO, possível par errado:", warning)
    videos = [
        build_video(e, enriched.get(e["key"], {}), used_slugs)
        for e in entries
        # Posts que não são dicas de impressão 3D (eventos, recados pessoais) ficam de fora.
        if not enriched.get(e["key"], {}).get("hidden")
    ]
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(videos, ensure_ascii=False, indent=1))

    both = sum(1 for v in videos if len(v["links"]) == 2)
    transcribed = sum(1 for v in videos if v["transcript"])
    enriched = sum(1 for v in videos if v["tags"])
    print(f"{len(videos)} vídeos ({both} nas duas redes) | {transcribed} transcritos | {enriched} descritos")
    print(f"-> {OUT_FILE.relative_to(ROOT.parent)}")


if __name__ == "__main__":
    main()
