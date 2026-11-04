import "server-only";
import type { Fuel, Prisma, Transmission, VehicleType } from "@prisma/client";
import { fuelLabels, transmissionLabels, vehicleTypeLabels } from "./labels";
import { prisma } from "./db";

/** Condição para um veículo aparecer no site público. */
export const publicVehicleWhere: Prisma.VehicleWhereInput = {
  published: true,
  status: { in: ["AVAILABLE", "RESERVED"] },
  store: { status: "ACTIVE" },
};

export const publicVehicleSelect = {
  id: true,
  brand: true,
  model: true,
  version: true,
  yearManufacture: true,
  yearModel: true,
  mileage: true,
  price: true,
  fuel: true,
  transmission: true,
  status: true,
  photos: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
  store: { select: { name: true, city: true, state: true, slug: true } },
} satisfies Prisma.VehicleSelect;

export type PublicVehicleCard = Prisma.VehicleGetPayload<{ select: typeof publicVehicleSelect }>;

export type VehicleSearch = {
  q?: string;
  marca?: string;
  tipo?: string;
  combustivel?: string;
  cambio?: string;
  precoMin?: string;
  precoMax?: string;
  anoMin?: string;
  anoMax?: string;
  kmMax?: string;
  cidade?: string;
  uf?: string;
  ordem?: string;
  pagina?: string;
};

export const PAGE_SIZE = 12;

function int(v?: string) {
  if (!v) return undefined;
  const n = parseInt(v.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : undefined;
}

export async function searchVehicles(s: VehicleSearch, storeId?: string) {
  const and: Prisma.VehicleWhereInput[] = [publicVehicleWhere];
  if (storeId) and.push({ storeId });

  const q = s.q?.trim();
  if (q) {
    for (const term of q.split(/\s+/).slice(0, 5)) {
      and.push({
        OR: [
          { brand: { contains: term, mode: "insensitive" } },
          { model: { contains: term, mode: "insensitive" } },
          { version: { contains: term, mode: "insensitive" } },
        ],
      });
    }
  }
  if (s.marca) and.push({ brand: { equals: s.marca, mode: "insensitive" } });
  if (s.tipo && s.tipo in vehicleTypeLabels) and.push({ type: s.tipo as VehicleType });
  if (s.combustivel && s.combustivel in fuelLabels) and.push({ fuel: s.combustivel as Fuel });
  if (s.cambio && s.cambio in transmissionLabels) and.push({ transmission: s.cambio as Transmission });
  const precoMin = int(s.precoMin);
  const precoMax = int(s.precoMax);
  if (precoMin !== undefined) and.push({ price: { gte: precoMin } });
  if (precoMax !== undefined) and.push({ price: { lte: precoMax } });
  const anoMin = int(s.anoMin);
  const anoMax = int(s.anoMax);
  if (anoMin !== undefined) and.push({ yearModel: { gte: anoMin } });
  if (anoMax !== undefined) and.push({ yearModel: { lte: anoMax } });
  const kmMax = int(s.kmMax);
  if (kmMax !== undefined) and.push({ mileage: { lte: kmMax } });
  if (s.cidade) and.push({ store: { city: { equals: s.cidade, mode: "insensitive" } } });
  if (s.uf) and.push({ store: { state: s.uf.toUpperCase() } });

  const orderBy: Prisma.VehicleOrderByWithRelationInput[] =
    s.ordem === "menor-preco" ? [{ price: "asc" }]
    : s.ordem === "maior-preco" ? [{ price: "desc" }]
    : s.ordem === "menor-km" ? [{ mileage: "asc" }]
    : s.ordem === "mais-novo" ? [{ yearModel: "desc" }]
    : [{ featured: "desc" }, { createdAt: "desc" }];

  const page = Math.max(1, int(s.pagina) ?? 1);
  const where: Prisma.VehicleWhereInput = { AND: and };

  const [total, items] = await prisma.$transaction([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: publicVehicleSelect,
    }),
  ]);
  return { total, items, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function publicBrands() {
  const rows = await prisma.vehicle.groupBy({
    by: ["brand"],
    where: publicVehicleWhere,
    _count: { _all: true },
    orderBy: { brand: "asc" },
  });
  return rows.map((r) => ({ brand: r.brand, count: r._count._all }));
}

export async function publicCities() {
  const rows = await prisma.store.findMany({
    where: { status: "ACTIVE", vehicles: { some: publicVehicleWhere } },
    select: { city: true, state: true },
    distinct: ["city", "state"],
    orderBy: [{ state: "asc" }, { city: "asc" }],
  });
  return rows;
}
