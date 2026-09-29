// Gera uma página com o instagram_browser_export.js como botão de favorito
// (para quando o Console do navegador não deixa colar código).
//
// Uso: node make_bookmarklet.mjs [pasta-de-saída]
import fs from "node:fs";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname);
const outDir = process.argv[2] ?? here;

const code = fs
  .readFileSync(path.join(here, "instagram_browser_export.js"), "utf8")
  .split("\n")
  .filter((line) => !line.trim().startsWith("//"))
  .map((line) => line.replace(/\s+\/\/\s.*$/, ""))
  .join(" ")
  .replace(/\s+/g, " ");
const href = `javascript:${encodeURIComponent(code)}`;

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Exportar reels do Instagram</title>
<style>
  body { font: 16px/1.6 system-ui, sans-serif; max-width: 560px; margin: 48px auto; padding: 0 16px; color: #1c1917; background: #faf8f5; }
  a.button { display: inline-block; padding: 12px 20px; border-radius: 10px; background: #d9480f; color: #fff; font-weight: 600; text-decoration: none; cursor: grab; }
  ol li { margin: 8px 0; }
  code { background: #eee; padding: 1px 5px; border-radius: 4px; }
</style>
</head>
<body>
  <h1>Exportar reels do @unipedia3d</h1>
  <p>Arraste este botão para a barra de favoritos do Chrome:</p>
  <p><a class="button" href="${href}" onclick="event.preventDefault(); alert('Não clique aqui: arraste este botão para a barra de favoritos e clique nele quando estiver no instagram.com.')">Exportar reels</a></p>
  <ol>
    <li>Se a barra de favoritos não aparece, aperte <code>Ctrl + Shift + B</code>.</li>
    <li>Abra <strong>instagram.com</strong> logado na conta secundária.</li>
    <li>Com o Instagram aberto, clique no favorito <strong>Exportar reels</strong> e espere uns 2 minutos (o título da aba mostra o progresso).</li>
    <li>O navegador baixa o arquivo <code>instagram.json</code>. Pronto, é só avisar.</li>
  </ol>
  <p style="color:#6f6964;font-size:14px">O botão só lê a lista pública de reels (link, legenda e data), com pausas entre as páginas. Não baixa vídeos nem envia nada para outro lugar.</p>
</body>
</html>
`;

const out = path.join(outDir, "exportar-reels-instagram.html");
fs.writeFileSync(out, html);
console.log(`${out} (${href.length} caracteres no favorito)`);
