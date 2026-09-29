# 365prints

Índice pesquisável (projeto de fã, sem fins lucrativos) dos vídeos do quadro "365 dias de impressão 3D" do @unipedia3d (TikTok + Instagram).

- `pipeline/` — Python (uv): coleta, transcrição e geração dos dados do site.
- `web/` — Next.js 16 + Tailwind 4. Leia `web/AGENTS.md` antes de mexer no site.

## Fluxo de atualização

```
cd pipeline
uv run collect_tiktok.py                  # lista + baixa vídeos novos do TikTok
uv run collect_instagram.py CONTA         # idem Instagram (sessão salva do instaloader)
uv run transcribe.py                      # Whisper local + quadros em .cache/frames
uv run enrich_queue.py                    # mostra o que falta descrever
# Claude escreve data/enriched/lote-NN.json
uv run build.py                           # gera web/src/data/videos.json e web/public/thumbs
```

`.cache/` (vídeos, quadros, thumbs originais) não é versionado. Depois de transcritos, os vídeos podem ser apagados; nunca são republicados.

## Formato das descrições (`pipeline/data/enriched/lote-NN.json`)

Cada lote é um objeto `chave-do-vídeo -> descrição`:

```json
{
  "tiktok_7507322799069940997": {
    "title": "Suporte de parede para organizar roupas",
    "summary": "1 a 2 frases dizendo o que a pessoa aprende ou vê no vídeo.",
    "category": "Coisas úteis para imprimir",
    "tags": ["organização", "MakerWorld", "custo da peça"],
    "keywords": ["cabide", "arara", "pendurar roupa", "wall hanger"]
  }
}
```

- `title`: curto, descreve o conteúdo (sem "Dia X de 365").
- `tags`: 3 a 6, aparecem no site; use termos que o público usa (PETG, AMS, Bambu Studio, warping…).
- `keywords`: ocultas, só para a busca: sinônimos, termos em inglês, grafias erradas comuns.
- `hidden: true` (opcional, sem os outros campos): post que não é dica de impressão 3D (evento, recado pessoal, collab de outro perfil); fica fora do site.
- `instagram` (opcional): código do reel (ex. `DVjqinKDx0q`) para casar à mão com o vídeo do TikTok quando a regra automática não acha o par.
- `day` (opcional): só quando a legenda traz o número do dia errado (ex.: legenda "Dia 32", fala "dia 42").
- `category`: exatamente uma destas (o build.py rejeita outras):
  Coisas úteis para imprimir · Personalização no fatiador · Acabamento e qualidade · Problemas e soluções · Suportes · Multicor e purga · Calibração e configurações · Filamentos · Manutenção e upgrades · Impressoras
- Se a transcrição for fraca (vídeo só com música), veja os quadros em `pipeline/.cache/frames/<chave>/`.
