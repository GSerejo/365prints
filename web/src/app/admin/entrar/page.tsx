import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <h1 className="text-2xl font-bold tracking-tight">Área do administrador</h1>
      <p className="mt-1 text-sm text-muted">Acesso restrito aos dados de uso do site.</p>
      <LoginForm />
    </div>
  );
}
