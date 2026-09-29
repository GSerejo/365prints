"""Lista os vídeos que ainda não têm título/descrição/tags (com transcrição ou legenda).

A descrição é escrita pelo Claude a partir desta saída e salva como um lote em
data/enriched/lote-NN.json (formato no CLAUDE.md da raiz do projeto).

Uso:
    uv run enrich_queue.py              # próximos 25
    uv run enrich_queue.py --limit 40
"""

import argparse
from datetime import datetime, timezone

from build import DATA, clean_caption, load_enriched, load_sources, read_json
from match import series_day


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=25)
    args = parser.parse_args()

    enriched = load_enriched()
    pending = []
    for entry in sorted(load_sources(enriched), key=lambda e: e["timestamp"]):
        transcript = read_json(DATA / "transcripts" / f"{entry['key']}.json", {"text": ""})
        # Vídeos só do Instagram não têm transcrição: a descrição sai da legenda.
        if entry["key"] not in enriched and (transcript["text"] or clean_caption(entry["caption"])):
            pending.append((entry, transcript))

    print(f"# {len(pending)} vídeos aguardando descrição\n")
    for entry, transcript in pending[: args.limit]:
        date = datetime.fromtimestamp(entry["timestamp"], timezone.utc).date()
        day = series_day(entry["caption"]) or series_day(transcript["text"][:200])
        print(f"## {entry['key']} | dia {day} | {date} | {entry['duration']}s")
        print(f"LEGENDA: {clean_caption(entry['caption'])}")
        print(f"FALA: {transcript['text'] or '(sem transcrição)'}\n")


if __name__ == "__main__":
    main()
