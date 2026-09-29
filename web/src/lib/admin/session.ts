import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "admin_session";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Quem pode entrar no painel. Cada pessoa tem a própria senha (variável de ambiente). */
const ADMINS = {
  dono: { label: "você", env: "ADMIN_PASSWORD" },
  uni: { label: "Uni", env: "ADMIN_PASSWORD_UNI" },
} as const;

export type AdminUser = keyof typeof ADMINS;

function passwordOf(user: AdminUser) {
  return process.env[ADMINS[user].env] || null;
}

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("Defina ADMIN_SESSION_SECRET (32+ caracteres) para usar a área administrativa.");
  }
  return value;
}

function sign(payload: string, password: string) {
  // A senha da pessoa entra na chave: trocar ou apagar a senha de alguém derruba só as sessões dela.
  return createHmac("sha256", `${secret()}:${password}`).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  // Compara hashes de tamanho fixo para não vazar o tamanho nem o conteúdo pelo tempo de resposta.
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export function adminLabel(user: AdminUser) {
  return ADMINS[user].label;
}

export function isAdminConfigured() {
  const anyPassword = (Object.keys(ADMINS) as AdminUser[]).some((user) => passwordOf(user));
  return Boolean(anyPassword && process.env.ADMIN_SESSION_SECRET);
}

/** Descobre de quem é a senha digitada (ou null). Confere todas, sem parar na primeira. */
export function userForPassword(candidate: string): AdminUser | null {
  let found: AdminUser | null = null;
  for (const user of Object.keys(ADMINS) as AdminUser[]) {
    const password = passwordOf(user);
    if (password && safeEqual(candidate, password)) found = user;
  }
  return found;
}

export async function createSession(user: AdminUser) {
  const payload = `${user}.${Date.now() + MAX_AGE_SECONDS * 1000}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload, passwordOf(user)!)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function deleteSession() {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
}

async function currentUser(): Promise<AdminUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !isAdminConfigured()) return null;
  const [user, expiresAt, signature] = token.split(".");
  if (!Object.hasOwn(ADMINS, user) || !expiresAt || !signature) return null;
  const password = passwordOf(user as AdminUser);
  if (!password || !safeEqual(signature, sign(`${user}.${expiresAt}`, password))) return null;
  return Number(expiresAt) > Date.now() ? (user as AdminUser) : null;
}

/** Chame no topo de toda página/ação da área administrativa. Devolve quem está logado. */
export async function requireAdmin() {
  const user = await currentUser();
  if (!user) redirect("/admin/entrar");
  return user;
}
