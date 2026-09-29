# Busca 365

Índice pesquisável dos vídeos do quadro "365 dias de impressão 3D" do [@unipedia3d](https://www.instagram.com/unipedia3d/). Projeto de fã, sem fins lucrativos: o site mostra título, resumo, transcrição e links; os vídeos continuam no TikTok e no Instagram.

- `web/`: o site (Next.js). É a única parte que vai para a Vercel.
- `pipeline/`: scripts que rodam no seu computador para coletar, transcrever e gerar os dados do site.

## Publicar (primeira vez)

1. **GitHub:** crie um repositório **privado** e envie este projeto (`git push`).
2. **PostHog** (grátis, posthog.com): crie a conta e o projeto e anote:
   - a chave do projeto (`phc_…`), em *Settings → Project → Project API key*;
   - o ID do projeto (o número na URL, `/project/12345`);
   - uma chave pessoal com permissão só de **Query: Read**, em *Settings → Personal API keys*;
   - em *Settings → Project → Timezone*, escolha **America/Sao_Paulo**.
3. **Vercel** (grátis, vercel.com, entrar com o GitHub): *Add New → Project*, importe o repositório e, em **Root Directory**, escolha `web`.
4. Em *Settings → Environment Variables* da Vercel, cadastre as variáveis de [`web/.env.example`](web/.env.example).
5. Faça o deploy. Depois, coloque o endereço final em `NEXT_PUBLIC_SITE_URL` e faça **Redeploy**: variáveis `NEXT_PUBLIC_*` só valem depois de um novo build.

O painel fica em `/admin` (senha em `ADMIN_PASSWORD`). Enquanto `NEXT_PUBLIC_ALLOW_INDEXING` não for `true`, o site pede para não aparecer no Google.

## Atualizar com vídeos novos

```bash
cd pipeline
uv run collect_tiktok.py
uv run collect_instagram.py CONTA_SECUNDARIA
uv run transcribe.py
uv run enrich_queue.py   # mostra o que falta descrever (o Claude escreve os lotes)
uv run build.py
cd ..
git add -A && git commit -m "Atualiza vídeos" && git push   # a Vercel publica sozinha
```

Detalhes do pipeline e do formato das descrições: [CLAUDE.md](CLAUDE.md).
