import "server-only";
import { prisma } from "./db";
import { DEFAULT_DOCUMENTS } from "./labels";
import type { FipePrice } from "./fipe";

/** Cria a lista de verificação padrão na primeira vez que a gestão é aberta. */
export async function ensureDefaultDocuments(vehicleId: string) {
  const count = await prisma.vehicleDocument.count({ where: { vehicleId } });
  if (count > 0) return;
  await prisma.vehicleDocument.createMany({ data: DEFAULT_DOCUMENTS.map((type) => ({ vehicleId, type })) });
}

export async function recordFipe(vehicleId: string, price: FipePrice, codes?: { kind: string; brand: string; model: string; year: string }) {
  await prisma.$transaction([
    prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        fipeValue: price.value,
        fipeCode: price.code,
        fipeName: price.name,
        fipeReference: price.reference,
        fipeCheckedAt: new Date(),
        ...(codes ? { fipeType: codes.kind, fipeBrandCode: codes.brand, fipeModelCode: codes.model, fipeYearCode: codes.year } : {}),
      },
    }),
    prisma.fipeHistory.upsert({
      where: { vehicleId_month: { vehicleId, month: price.month } },
      create: { vehicleId, month: price.month, reference: price.reference, value: price.value },
      update: { value: price.value, reference: price.reference },
    }),
  ]);
}

