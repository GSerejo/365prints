// Ícones das categorias (traço de 24px, cor do texto).
function gearPath() {
  const points: string[] = [];
  const teeth = 8;
  for (let i = 0; i < teeth * 4; i++) {
    const radius = i % 4 < 2 ? 9 : 6.8;
    const angle = ((i + 0.5) / (teeth * 4)) * Math.PI * 2;
    points.push(`${(12 + Math.cos(angle) * radius).toFixed(2)} ${(12 + Math.sin(angle) * radius).toFixed(2)}`);
  }
  return `M${points.join("L")}Z`;
}

const ICONS: Record<string, React.ReactNode> = {
  "Coisas úteis para imprimir": <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3ZM4 7.5 12 12l8-4.5M12 12v9" />,
  "Personalização no fatiador": (
    <>
      <path d="M4 7h9m4 0h3M4 17h3m4 0h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  "Acabamento e qualidade": (
    <path d="m11 3 1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9L11 3Zm7.5 11 .9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" />
  ),
  "Problemas e soluções": (
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5a2.1 2.1 0 0 0 3 3l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z" />
  ),
  Suportes: <path d="M4 5h16M12 21v-8m0 0L7 5m5 8 5-8m-5 8V5M8 21h8" />,
  "Multicor e purga": (
    <>
      <circle cx="9" cy="9.5" r="4.5" />
      <circle cx="15" cy="9.5" r="4.5" />
      <circle cx="12" cy="14.5" r="4.5" />
    </>
  ),
  "Calibração e configurações": <path d="M4 17a8 8 0 1 1 16 0M12 17l4-5M12 6v1.5M6.3 9.3l1 1M17.7 9.3l-1 1M12 17h.01" />,
  Filamentos: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  "Manutenção e upgrades": (
    <>
      <path d={gearPath()} />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  Impressoras: <path d="M5 21V4h14v17M3 21h18M5 9h14m-9 0v3h4V9m-3 3 1 2 1-2" />,
};

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {ICONS[category] ?? <circle cx="12" cy="12" r="3" />}
    </svg>
  );
}
