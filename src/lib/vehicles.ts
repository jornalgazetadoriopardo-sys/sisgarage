import "server-only";
import type { Fuel, Prisma, Transmission, VehicleType } from "@prisma/client";
import { prisma } from "./db";
import { fuelLabels, transmissionLabels, vehicleTypeLabels } from "./labels";

/** Condição para um veículo aparecer no site público. */
export const publicVehicleWhere: Prisma.VehicleWhereInput = {
  published: true,
  status: { in: ["AVAILABLE", "RESERVED"] },
  store: { status: "ACTIVE" },
};

export const publicVehicleSelect = {
  id: true,
  type: true,
  brand: true,
  model: true,
  version: true,
  yearManufacture: true,
  yearModel: true,
  mileage: true,
  price: true,
  previousPrice: true,
  fuel: true,
  transmission: true,
  engine: true,
  status: true,
  featured: true,
  featuredLabel: true,
  photos: { orderBy: { position: "asc" }, take: 1, select: { thumbUrl: true } },
  store: { select: { name: true, city: true, state: true, slug: true } },
} satisfies Prisma.VehicleSelect;

export type PublicVehicleCard = Prisma.VehicleGetPayload<{ select: typeof publicVehicleSelect }>;

export type VehicleSearch = {
  q?: string;
  marca?: string;
  tipo?: string;
  combustivel?: string;
  cambio?: string;
  opcional?: string;
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

/**
 * Busca no servidor (com paginação). A collation utf8mb4_unicode_ci do MySQL
 * já ignora maiúsculas e acentos: "volks" encontra "Volkswagen", "sao" encontra "São".
 */
export async function searchVehicles(s: VehicleSearch, opts: { storeId?: string } = {}) {
  const and: Prisma.VehicleWhereInput[] = [publicVehicleWhere];
  if (opts.storeId) and.push({ storeId: opts.storeId });

  const q = s.q?.trim();
  if (q) {
    for (const term of q.split(/\s+/).slice(0, 5)) {
      and.push({
        OR: [{ brand: { contains: term } }, { model: { contains: term } }, { version: { contains: term } }],
      });
    }
  }
  if (s.marca) and.push({ brand: s.marca });
  if (s.tipo && s.tipo in vehicleTypeLabels) and.push({ type: s.tipo as VehicleType });
  if (s.combustivel && s.combustivel in fuelLabels) and.push({ fuel: s.combustivel as Fuel });
  if (s.cambio && s.cambio in transmissionLabels) and.push({ transmission: s.cambio as Transmission });
  if (s.opcional) and.push({ features: { some: { name: s.opcional } } });
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
  if (s.cidade) and.push({ store: { city: s.cidade } });
  if (s.uf) and.push({ store: { state: s.uf.toUpperCase() } });

  const orderBy: Prisma.VehicleOrderByWithRelationInput[] =
    s.ordem === "menor-preco" ? [{ price: "asc" }]
    : s.ordem === "maior-preco" ? [{ price: "desc" }]
    : s.ordem === "menor-km" ? [{ mileage: "asc" }]
    : s.ordem === "mais-novo" ? [{ yearModel: "desc" }]
    : opts.storeId ? [{ position: "asc" }, { createdAt: "desc" }] // vitrine da loja: ordem escolhida pela loja
    : [{ featured: "desc" }, { createdAt: "desc" }];

  const page = Math.max(1, int(s.pagina) ?? 1);
  const where: Prisma.VehicleWhereInput = { AND: and };
  const [total, items] = await prisma.$transaction([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: publicVehicleSelect }),
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

/** "Veja também": mesmo tipo, preço parecido, da mesma loja primeiro. */
export async function similarVehicles(v: { id: string; type: VehicleType; price: Prisma.Decimal; storeId: string }) {
  const price = Number(v.price);
  const candidates = await prisma.vehicle.findMany({
    where: {
      ...publicVehicleWhere,
      id: { not: v.id },
      type: v.type,
      price: { gte: price * 0.6, lte: price * 1.4 },
    },
    take: 24,
    select: { ...publicVehicleSelect, storeId: true },
  });
  return candidates
    .map((c) => ({ c, score: Math.abs(Number(c.price) - price) / price - (c.storeId === v.storeId ? 0.15 : 0) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map(({ c }) => c);
}

/** Opcionais mais comuns no estoque publicado (para o filtro). */
export async function publicFeatures() {
  const rows = await prisma.vehicleFeature.groupBy({
    by: ["name"],
    where: { vehicle: publicVehicleWhere },
    _count: { name: true },
    orderBy: { _count: { name: "desc" } },
    take: 25,
  });
  return rows.map((r) => r.name).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
