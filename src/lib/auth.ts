import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "./db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session-token";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(
  user: { id: string; role: Role; storeId: string | null },
  actingStoreId: string | null = null,
) {
  const token = await signSession({ userId: user.id, role: user.role, storeId: user.storeId, actingStoreId });
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

export const getSession = cache(async () => {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
});

/** Usuário logado (lido do banco, para refletir desativação/troca de papel). */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { store: true },
  });
  if (!user || !user.active) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/**
 * Contexto do painel da loja. Funciona para o dono, o vendedor e para o admin
 * da plataforma quando ele entra pelo botão "Acessar painel" (asAdmin = true).
 */
export const requireStoreUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  if (user.role === "SUPER_ADMIN") {
    const session = await getSession();
    const store = session?.actingStoreId
      ? await prisma.store.findUnique({ where: { id: session.actingStoreId } })
      : null;
    if (!store) redirect("/admin");
    return { user, store, storeId: store.id, isOwner: true, asAdmin: true };
  }

  if (!user.store || !user.storeId) redirect("/entrar");
  return {
    user,
    store: user.store,
    storeId: user.storeId,
    isOwner: user.role === "STORE_OWNER",
    asAdmin: false,
  };
});

export type StoreContext = Awaited<ReturnType<typeof requireStoreUser>>;

/** Dono da loja (ou admin agindo como loja). */
export async function requireStoreOwner() {
  const ctx = await requireStoreUser();
  if (!ctx.isOwner) redirect("/painel");
  return ctx;
}

/** Custos, compra e lucro: só para o dono (vendedor não vê). */
export function canSeeFinance(ctx: StoreContext) {
  return ctx.isOwner;
}

export async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  if (user.role !== "SUPER_ADMIN") redirect("/painel");
  return user;
}
