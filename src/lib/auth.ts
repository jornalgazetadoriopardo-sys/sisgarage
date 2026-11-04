import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session-token";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: { id: string; role: import("@prisma/client").Role; storeId: string | null }) {
  const token = await signSession({ userId: user.id, role: user.role, storeId: user.storeId });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Usuário logado (lido do banco, para refletir desativação/troca de papel). */
export async function getCurrentUser() {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { store: true },
  });
  if (!user || !user.active) return null;
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Exige usuário de loja. Retorna o usuário e a loja. */
export async function requireStoreUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  if (!user.store || !user.storeId) redirect(user.role === "SUPER_ADMIN" ? "/admin" : "/entrar");
  return { user, store: user.store, storeId: user.storeId };
}

export async function requireStoreOwner() {
  const ctx = await requireStoreUser();
  if (ctx.user.role !== "STORE_OWNER") redirect("/painel");
  return ctx;
}

export async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  if (user.role !== "SUPER_ADMIN") redirect("/painel");
  return user;
}
