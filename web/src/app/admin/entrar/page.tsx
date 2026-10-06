import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="relative overflow-hidden px-4 py-16 sm:py-24">
      <div aria-hidden className="plate-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_65%)]" />
      <div className="relative mx-auto max-w-sm rounded-3xl border border-line bg-surface p-7 shadow-xl shadow-black/5">
        <span aria-hidden className="grid size-12 place-items-center rounded-2xl bg-[#141110] text-brand">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
            <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2" />
          </svg>
        </span>
        <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight">Painel do 365prints</h1>
        <p className="mt-1 text-sm text-muted">Quem acessa, o que buscam e quais vídeos abrem. Entre com a sua senha.</p>
        <LoginForm />
      </div>
    </div>
  );
}
