"use server";

import { redirect } from "next/navigation";
import { createSession, deleteSession, isAdminConfigured, userForPassword } from "@/lib/admin/session";

export type LoginState = { error: string | null };

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  if (!isAdminConfigured()) {
    return { error: "A área administrativa ainda não foi configurada (ADMIN_PASSWORD e ADMIN_SESSION_SECRET)." };
  }
  const user = userForPassword(String(formData.get("password") ?? ""));
  if (!user) {
    // Atraso fixo para dificultar tentativas em sequência.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return { error: "Senha incorreta." };
  }
  await createSession(user);
  redirect("/admin");
}

export async function logout() {
  await deleteSession();
  redirect("/admin/entrar");
}
