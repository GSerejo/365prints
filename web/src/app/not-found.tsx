import Link from "next/link";

// Um "espaguete" de filamento: caminho aleatório, mas sempre o mesmo (semente fixa).
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function spaghetti(seed: number, loops: number) {
  const next = random(seed);
  const points: [number, number][] = [[200, 92]];
  for (let i = 1; i <= loops; i++) {
    const p = i / loops;
    const spread = 30 + p * 150;
    points.push([200 + (next() - 0.5) * 2 * spread, Math.min(100 + p * 150 + (next() - 0.5) * 70 * p, 262)]);
  }
  let d = `M${points[0].join(" ")}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [points[i - 1] ?? points[i], points[i], points[i + 1], points[i + 2] ?? points[i + 1]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 5, p1[1] + (p2[1] - p0[1]) / 5];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 5, p2[1] - (p3[1] - p1[1]) / 5];
    d += ` C${c1.map((n) => n.toFixed(1)).join(" ")} ${c2.map((n) => n.toFixed(1)).join(" ")} ${p2.map((n) => n.toFixed(1)).join(" ")}`;
  }
  return d;
}

const STRANDS = [spaghetti(365, 46), spaghetti(42, 30)];

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 sm:py-20 md:grid-cols-[1fr_1.1fr]">
      <div className="order-2 md:order-1">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent">Erro 404</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-6xl">Deu espaguete.</h1>
        <p className="mt-4 max-w-md text-pretty text-lg leading-relaxed text-muted">
          A impressão desta página soltou da mesa no meio do caminho. O link pode estar errado, ou esse dia do quadro
          ainda não saiu.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/" className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-bg transition hover:bg-brand hover:text-white">
            Voltar ao início
          </Link>
          <Link href="/videos" className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold transition hover:border-brand hover:text-accent">
            Buscar um vídeo
          </Link>
          <a href="/aleatorio" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-accent">
            Me leva a um dia aleatório
          </a>
        </div>
      </div>

      <svg viewBox="0 0 400 300" className="order-1 w-full md:order-2" role="img" aria-label="Bico de impressora soltando um emaranhado de filamento">
        <rect x="40" y="268" width="320" height="10" rx="3" className="fill-line" />
        {/* Peça que soltou da mesa e tombou */}
        <g transform="rotate(-22 74 268)">
          <rect x="74" y="228" width="62" height="40" rx="3" className="day-printed" fill="var(--brand)" />
        </g>
        {/* Cabeça de impressão */}
        <rect x="150" y="0" width="100" height="14" rx="4" className="fill-line" />
        <rect x="168" y="14" width="64" height="50" rx="10" className="fill-ink" />
        <circle cx="200" cy="39" r="14" fill="none" stroke="var(--bg)" strokeWidth="3" />
        <rect x="186" y="64" width="28" height="12" rx="2" className="fill-muted" />
        <path d="M192 76h16l-6 14h-4z" fill="#d2a24c" />
        {STRANDS.map((d, index) => (
          <path
            key={index}
            d={d}
            pathLength={1}
            fill="none"
            stroke="var(--brand)"
            strokeWidth={index === 0 ? 3.2 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={index === 0 ? 1 : 0.55}
            className="draw-line"
            style={{ animationDelay: `${index * 0.6}s` }}
          />
        ))}
      </svg>
    </div>
  );
}
