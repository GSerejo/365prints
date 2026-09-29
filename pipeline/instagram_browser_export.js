// Plano B para listar os reels quando o instaloader leva "429 Too Many Requests".
//
// Como usar:
//   1. Abra https://www.instagram.com logado na conta secundária.
//   2. F12 > Console. (No Chrome, digite `allow pasting` e Enter se ele pedir.)
//   3. Cole este arquivo inteiro e aperte Enter.
//   4. Espere o aviso "Pronto" (o título da aba mostra o progresso): o navegador
//      baixa o arquivo instagram.json.
//
// Só lê dados públicos do perfil (link, legenda e data de cada reel), com pausas
// entre as páginas. Não baixa vídeos nem envia nada para lugar nenhum.
(async () => {
  if (!location.hostname.endsWith("instagram.com")) {
    alert("Abra https://www.instagram.com (logado na conta secundária) e clique no favorito lá.");
    return;
  }
  const PROFILE = "unipedia3d";
  const headers = { "X-IG-App-ID": "936619743392459" };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const getJson = async (url) => {
    const response = await fetch(url, { headers, credentials: "include" });
    if (!response.ok) throw new Error(`${response.status} em ${url}`);
    return response.json();
  };

  try {
    // Mesmo caminho que o site usa ao rolar o perfil (evita o endpoint de perfil, mais limitado).
    let feed = await getJson(`/api/v1/feed/user/${PROFILE}/username/?count=12`);
    const userId = (feed.user ?? feed.items[0].user).pk;

    const reels = [];
    for (let page = 1; ; page++) {
      for (const item of feed.items) {
        if (item.media_type !== 2) continue; // 2 = vídeo
        reels.push({
          shortcode: item.code,
          webpage_url: `https://www.instagram.com/reel/${item.code}/`,
          caption: item.caption?.text ?? "",
          timestamp: item.taken_at,
          duration: item.video_duration ?? null,
          view_count: item.play_count ?? item.view_count ?? null,
        });
      }
      console.log(`Página ${page}: ${reels.length} reels até agora`);
      document.title = `Exportando… ${reels.length} reels`;
      if (!feed.more_available || !feed.next_max_id) break;
      await sleep(3000 + Math.random() * 3000);
      feed = await getJson(`/api/v1/feed/user/${userId}/?count=12&max_id=${feed.next_max_id}`);
    }

    reels.sort((a, b) => a.timestamp - b.timestamp);
    const blob = new Blob([JSON.stringify(reels, null, 2)], { type: "application/json" });
    const link = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: "instagram.json",
    });
    link.click();
    document.title = "Instagram";
    alert(`Pronto: ${reels.length} reels salvos em instagram.json (pasta Downloads).`);
  } catch (error) {
    alert(`Não deu certo: ${error.message}. Espere alguns minutos e tente de novo.`);
  }
})();
