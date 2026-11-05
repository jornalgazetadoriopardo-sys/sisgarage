import { PrismaClient } from "@prisma/client";
import { normalizeDatabaseUrl } from "./database-url.mjs";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: normalizeDatabaseUrl(process.env.DATABASE_URL) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
