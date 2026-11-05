import "server-only";
import { prisma } from "./db";

/** Opcionais que a loja já usou (viram sugestões no formulário). */
export async function storeFeatureNames(storeId: string) {
  const rows = await prisma.vehicleFeature.findMany({
    where: { vehicle: { storeId } },
    distinct: ["name"],
    select: { name: true },
    orderBy: { name: "asc" },
    take: 100,
  });
  return rows.map((r) => r.name);
}
