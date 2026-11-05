import "server-only";
import sharp from "sharp";
import { prisma } from "../db";
import { readPublicFile } from "../storage";

export async function loadSaleForDocs(saleId: string, storeId: string) {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, storeId },
    include: {
      store: true,
      customer: true,
      vehicle: true,
      tradeInVehicle: true,
      payments: { orderBy: [{ dueDate: "asc" }, { id: "asc" }] },
    },
  });
  if (!sale) return null;
  let logo: Buffer | null = null;
  if (sale.store.logoUrl) {
    logo = await readPublicFile(sale.store.logoUrl)
      .then((b) => sharp(b).resize(200, 200, { fit: "inside" }).png().toBuffer())
      .catch(() => null);
  }
  return { ...sale, logo };
}

export type SaleDocData = NonNullable<Awaited<ReturnType<typeof loadSaleForDocs>>>;
