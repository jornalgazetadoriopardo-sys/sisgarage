import "server-only";
import { prisma } from "./db";
import type { StoreContext } from "./auth";

/** Registra quem fez o quê. Nunca derruba a ação principal se falhar. */
export async function audit(
  ctx: Pick<StoreContext, "user" | "storeId" | "asAdmin">,
  action: string,
  entity?: string,
  entityId?: string,
  details?: string,
) {
  await prisma.auditLog
    .create({
      data: {
        storeId: ctx.storeId,
        userId: ctx.user.id,
        userName: ctx.user.name.slice(0, 100),
        asAdmin: ctx.asAdmin,
        action,
        entity,
        entityId,
        details: details?.slice(0, 255),
      },
    })
    .catch(() => undefined);
}
