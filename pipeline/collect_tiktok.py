"""Coleta a lista de vídeos do perfil no TikTok e baixa os arquivos para transcrição.

Uso:
    uv run collect_tiktok.py            # lista + baixa o que falta
    uv run collect_tiktok.py --no-download
"""

import argparse
import json
from pathlib import Path

import yt_dlp

PROFILE_URL = "https://www.tiktok.com/@unipedia3d"
# ID fixo do canal: listar por ele é mais confiável do que pelo @.
CHANNEL_URL = "tiktokuser:MS4wLjABAAAAhctqVar6a3Avf2Db0i1hh2oVwZvnJmvyz2FAcRsdVrNgQZFmH7eia_VGC9OJc46G"

ROOT = Path(__file__).resolve().parent
RAW_FILE = ROOT / "data" / "raw" / "tiktok.json"
CACHE = ROOT / ".cache"
VIDEO_DIR = CACHE / "videos" / "tiktok"
THUMB_DIR = CACHE / "thumbs" / "tiktok"

KEEP_FIELDS = (
    "id", "webpage_url", "description", "timestamp", "upload_date", "duration",
    "view_count", "like_count", "comment_count", "save_count",
)


def list_videos() -> list[dict]:
    opts = {"extract_flat": True, "quiet": True, "sleep_interval_requests": 1}
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(CHANNEL_URL, download=False)
    videos = [{k: entry.get(k) for k in KEEP_FIELDS} for entry in info["entries"]]
    for video in videos:
        video["webpage_url"] = video["webpage_url"] or f"{PROFILE_URL}/video/{video['id']}"
    return sorted(videos, key=lambda v: v["timestamp"] or 0)


def download(videos: list[dict]) -> None:
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    opts = {
        # Menor arquivo com áudio basta para transcrever e tirar quadros.
        "format_sort": ["+size", "+br"],
        "outtmpl": {
            "default": str(VIDEO_DIR / "%(id)s.%(ext)s"),
            "thumbnail": str(THUMB_DIR / "%(id)s.%(ext)s"),
        },
        "writethumbnail": True,
        "download_archive": str(CACHE / "tiktok-archive.txt"),
        # Pausas entre downloads para não sobrecarregar nem chamar atenção.
        "sleep_interval": 3,
        "max_sleep_interval": 8,
        "ignoreerrors": True,
        "noprogress": True,
        "quiet": True,
        "no_warnings": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([v["webpage_url"] for v in videos])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-download", action="store_true")
    args = parser.parse_args()

    videos = list_videos()
    RAW_FILE.parent.mkdir(parents=True, exist_ok=True)
    RAW_FILE.write_text(json.dumps(videos, ensure_ascii=False, indent=2))
    print(f"{len(videos)} vídeos listados -> {RAW_FILE.relative_to(ROOT)}")

    if not args.no_download:
        download(videos)
        print(f"{len(list(VIDEO_DIR.glob('*.mp4')))} vídeos em {VIDEO_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
