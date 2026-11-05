import "server-only";
import { prisma } from "./db";
import { vehicleTitle } from "./format";

/** Veículos que podem ser vendidos (sem venda ativa) e clientes da loja, para o formulário. */
export async function saleFormOptions(storeId: string, includeVehicleId?: string) {
  const [vehicles, customers] = await Promise.all([
    prisma.vehicle.findMany({
      where: {
        storeId,
        OR: [
          { status: { not: "SOLD" }, sales: { none: { status: { not: "CANCELED" } } } },
          ...(includeVehicleId ? [{ id: includeVehicleId }] : []),
        ],
      },
      orderBy: [{ brand: "asc" }, { model: "asc" }],
      select: { id: true, brand: true, model: true, version: true, yearModel: true, price: true, mileage: true, plate: true, photos: { orderBy: { position: "asc" }, take: 1, select: { thumbUrl: true } } },
    }),
    prisma.customer.findMany({ where: { storeId }, orderBy: { name: "asc" }, select: { id: true, name: true, document: true, phone: true }, take: 1000 }),
  ]);
  return {
    vehicles: vehicles.map((v) => ({
      id: v.id,
      title: `${vehicleTitle(v)} ${v.yearModel}`,
      price: Number(v.price),
      mileage: v.mileage,
      plate: v.plate,
      thumb: v.photos[0]?.thumbUrl ?? null,
    })),
    customers,
  };
}
