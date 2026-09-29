"""Transcreve os vídeos baixados e extrai alguns quadros de cada um.

Para cada vídeo em .cache/videos/<plataforma>/<id>.mp4 gera:
    data/transcripts/<plataforma>_<id>.json   (texto + trechos com tempo)
    .cache/frames/<plataforma>_<id>/NN.jpg    (quadros para consulta visual)

Uso:
    uv run transcribe.py                 # todos que faltam
    uv run transcribe.py --limit 1       # teste rápido
"""

import argparse
import json
import os
import time
from pathlib import Path

import av
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parent
VIDEO_ROOT = ROOT / ".cache" / "videos"
FRAME_ROOT = ROOT / ".cache" / "frames"
TRANSCRIPT_DIR = ROOT / "data" / "transcripts"

MODEL = "large-v3-turbo"
FRAMES_PER_VIDEO = 4
FRAME_WIDTH = 480


def extract_frames(video: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    with av.open(str(video)) as container:
        stream = container.streams.video[0]
        duration = float(stream.duration * stream.time_base) if stream.duration else 0
        if not duration:
            return
        # Quadros espalhados pelo vídeo, evitando o começo e o fim exatos.
        for n in range(FRAMES_PER_VIDEO):
            at = duration * (n + 1) / (FRAMES_PER_VIDEO + 1)
            container.seek(int(at / stream.time_base), stream=stream)
            frame = next(container.decode(stream))
            image = frame.to_image()
            image.thumbnail((FRAME_WIDTH, FRAME_WIDTH * 2))
            image.save(out_dir / f"{n + 1:02d}.jpg", quality=80)


def dedupe(segments: list[dict]) -> list[dict]:
    """Remove repetições seguidas da mesma frase (alucinação comum do Whisper no fim do áudio)."""
    kept: list[dict] = []
    for segment in segments:
        if kept and segment["text"] == kept[-1]["text"]:
            continue
        kept.append(segment)
    return kept


def transcribe(model: WhisperModel, video: Path) -> dict:
    segments, info = model.transcribe(
        str(video),
        language="pt",
        vad_filter=True,
        # Evita que o modelo entre em loop repetindo a mesma frase.
        condition_on_previous_text=False,
        # Ajuda o modelo a acertar os termos técnicos mais comuns do nicho.
        initial_prompt="Impressão 3D, fatiador, Bambu Lab, MakerWorld, Bambu Studio, Orca Slicer, filamento PLA, PETG, TPU, "
        "bico, mesa, placa PEI, altura de camada, suporte, overhang, purga, AMS.",
    )
    segments = dedupe([
        {"start": round(s.start, 1), "end": round(s.end, 1), "text": s.text.strip()}
        for s in segments
    ])
    return {
        "text": " ".join(s["text"] for s in segments),
        "segments": segments,
        "duration": round(info.duration, 1),
        "model": MODEL,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()

    TRANSCRIPT_DIR.mkdir(parents=True, exist_ok=True)
    pending = [
        video
        for video in sorted(VIDEO_ROOT.glob("*/*.mp4"))
        if not (TRANSCRIPT_DIR / f"{video.parent.name}_{video.stem}.json").exists()
    ][: args.limit]
    print(f"{len(pending)} vídeos para transcrever")
    if not pending:
        return

    model = WhisperModel(MODEL, device="cpu", compute_type="int8", cpu_threads=max(1, (os.cpu_count() or 8) // 2))
    for i, video in enumerate(pending, 1):
        key = f"{video.parent.name}_{video.stem}"
        started = time.time()
        result = transcribe(model, video)
        extract_frames(video, FRAME_ROOT / key)
        (TRANSCRIPT_DIR / f"{key}.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
        took = time.time() - started
        print(f"[{i}/{len(pending)}] {key}: {result['duration']}s de áudio em {took:.0f}s", flush=True)


if __name__ == "__main__":
    main()
