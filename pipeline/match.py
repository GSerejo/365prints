"""Regras para reconhecer o mesmo vídeo publicado no TikTok e no Instagram."""

import re
import unicodedata
from datetime import datetime, timezone
from difflib import SequenceMatcher

# "Dia 12 de 365", "dia 12/365" e erros de digitação como "de 364".
DAY_RE = re.compile(r"\bdia\s*(\d{1,3})\s*(?:de|/)\s*36\d", re.IGNORECASE)
# Qualquer "dia 12" solto (usado só como confirmação quando a outra rede tem o número).
LOOSE_DAY_RE = re.compile(r"\bdia\s*(\d{1,3})\b", re.IGNORECASE)
# A frase padrão do quadro, inclusive com erros ("Dia 249 de 35 i…").
SERIES_INTRO_RE = re.compile(r"dia\s*\d{1,3}\s*(?:de|/)\s*\d{2,3}[^.!?\n]*[.!?]?", re.IGNORECASE)

# O TikTok às vezes recebe o vídeo semanas depois do Instagram.
MAX_DAYS_APART = 60


def series_day(caption: str | None) -> int | None:
    match = DAY_RE.search(caption or "")
    return int(match.group(1)) if match else None


def loose_day(caption: str | None) -> int | None:
    match = LOOSE_DAY_RE.search(caption or "")
    return int(match.group(1)) if match else None


def normalize(caption: str | None) -> str:
    text = unicodedata.normalize("NFKD", caption or "").encode("ascii", "ignore").decode()
    text = re.sub(r"#\w+|@\w+", " ", text.lower())
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def caption_body(caption: str | None) -> str:
    """Legenda sem a frase padrão do quadro, hashtags e menções."""
    return normalize(SERIES_INTRO_RE.sub(" ", caption or ""))


def same_video(a: dict, b: dict) -> bool:
    """a e b têm 'caption' e 'timestamp' (segundos UTC)."""
    day_a, day_b = series_day(a["caption"]), series_day(b["caption"])
    if day_a is not None and day_b is not None:
        return day_a == day_b
    if abs((a["timestamp"] or 0) - (b["timestamp"] or 0)) > MAX_DAYS_APART * 86400:
        return False

    # Só uma das redes traz o número do dia: se a outra citar um dia, ele precisa bater.
    if day_a is not None or day_b is not None:
        known, other = (day_a, b) if day_a is not None else (day_b, a)
        mentioned = loose_day(other["caption"])
        if mentioned is not None:
            return mentioned == known

    text_a, text_b = caption_body(a["caption"]), caption_body(b["caption"])
    if len(text_a) < 20 or len(text_b) < 20:
        return False
    # Uma legenda costuma ser trecho da outra (uma rede corta ou reescreve o começo),
    # então procura um pedaço do início e um do meio de cada uma na outra.
    for x, y in ((text_a, text_b), (text_b, text_a)):
        if x[:40] in y or (len(x) >= 80 and x[20:60] in y):
            return True
    return SequenceMatcher(None, text_a[:200], text_b[:200]).ratio() > 0.75


def to_timestamp(value: datetime) -> int:
    return int(value.replace(tzinfo=timezone.utc).timestamp())
