// Funções de token compatíveis com o middleware (Edge runtime): sem Prisma, sem Node APIs.
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "sisgarage_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export type SessionPayload = {
  userId: string;
  role: Role;
  storeId: string | null;
  /** Admin da plataforma usando o painel de uma loja */
  actingStoreId?: string | null;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET não configurado (mínimo 16 caracteres).");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      userId: String(payload.userId),
      role: payload.role as Role,
      storeId: (payload.storeId as string | null) ?? null,
      actingStoreId: (payload.actingStoreId as string | null) ?? null,
    };
  } catch {
    return null;
  }
}
