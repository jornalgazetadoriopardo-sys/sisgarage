import "server-only";
import { prisma } from "./db";
import { vehicleFinance } from "./finance";

const num = (v: { toString(): string } | null | undefined) => (v === null || v === undefined ? null : Number(v.toString()));
const DAY = 86_400_000;

export type AgingBucket = "0-30" | "31-60" | "61-90" | "90+";
export function agingBucket(days: number): AgingBucket {
  return days <= 30 ? "0-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : "90+";
}

/** Métricas comuns: tempo em estoque, FIPE e preço ao longo do tempo. */
export function vehicleMetrics(v: {
  createdAt: Date;
  purchaseDate: Date | null;
  status: string;
  price: { toString(): string };
  fipeValue: { toString(): string } | null;
  fipeHistory: { month: string; value: { toString(): string } }[];
  priceHistory: { price: { toString(): string }; changedAt: Date }[];
  saleDate?: Date | null;
}) {
  const entry = v.purchaseDate ?? v.createdAt;
  const end = v.status === "SOLD" && v.saleDate ? v.saleDate : new Date();
  const days = Math.max(0, Math.floor((end.getTime() - entry.getTime()) / DAY));
  const fipes = [...v.fipeHistory].sort((a, b) => a.month.localeCompare(b.month));
  const fipeFirst = fipes.length ? num(fipes[0].value)! : null;
  const fipeLast = fipes.length ? num(fipes[fipes.length - 1].value)! : num(v.fipeValue);
  const fipeChange = fipeFirst && fipeLast && fipes.length > 1 ? ((fipeLast - fipeFirst) / fipeFirst) * 100 : null;
  const prices = [...v.priceHistory].sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());
  const priceFirst = prices.length ? num(prices[0].price)! : num(v.price)!;
  const price = num(v.price)!;
  const priceChange = priceFirst ? ((price - priceFirst) / priceFirst) * 100 : 0;
  const vsFipe = fipeLast ? ((price - fipeLast) / fipeLast) * 100 : null;
  return {
    entry,
    days,
    bucket: agingBucket(days),
    fipeFirst,
    fipeLast,
    fipeChange,
    fipeMonths: fipes.length,
    priceFirst,
    price,
    priceChange,
    priceChanges: Math.max(0, prices.length - 1),
    vsFipe,
  };
}

/** Tudo sobre um veículo, para a ficha (tela e PDF). */
export async function loadVehicleReport(storeId: string, id: string) {
  const v = await prisma.vehicle.findFirst({
    where: { id, storeId },
    include: {
      store: true,
      photos: { orderBy: { position: "asc" } },
      features: { orderBy: { name: "asc" } },
      expenses: { orderBy: { date: "asc" } },
      taxes: { orderBy: { dueDate: "asc" } },
      documents: { orderBy: { type: "asc" } },
      fipeHistory: { orderBy: { month: "asc" } },
      priceHistory: { orderBy: { changedAt: "asc" } },
      sales: {
        where: { status: { not: "CANCELED" } },
        include: { customer: { select: { id: true, name: true } }, payments: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { leads: true, appointments: true } },
    },
  });
  if (!v) return null;
  const sale = v.sales[0] ?? null;
  const [timeline, appointmentsDone] = await Promise.all([
    prisma.auditLog.findMany({ where: { storeId, entityId: id }, orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.appointment.count({ where: { vehicleId: id, status: "DONE" } }),
  ]);
  const metrics = vehicleMetrics({ ...v, saleDate: sale?.status === "COMPLETED" ? sale.date : null });
  const finance = vehicleFinance({ ...v, price: sale?.status === "COMPLETED" ? sale.price : v.price });
  return { v, sale, metrics, finance, timeline, appointmentsDone };
}

export type VehicleReport = NonNullable<Awaited<ReturnType<typeof loadVehicleReport>>>;

/** Linhas do controle de estoque (veículos não vendidos). */
export async function loadStock(storeId: string) {
  const vehicles = await prisma.vehicle.findMany({
    where: { storeId, status: { not: "SOLD" } },
    select: {
      id: true, brand: true, model: true, version: true, yearModel: true, plate: true, status: true, published: true,
      price: true, purchasePrice: true, purchaseDate: true, createdAt: true, fipeValue: true, views: true,
      photos: { orderBy: { position: "asc" }, take: 1, select: { thumbUrl: true } },
      expenses: { select: { amount: true } },
      taxes: { select: { amount: true, paidAt: true } },
      fipeHistory: { select: { month: true, value: true } },
      priceHistory: { select: { price: true, changedAt: true } },
      _count: { select: { leads: true, photos: true } },
    },
  });
  return vehicles.map((v) => ({ v, m: vehicleMetrics(v), f: vehicleFinance(v) }));
}

/** Tempo médio para vender (vendas concluídas nos últimos 6 meses). */
export async function averageDaysToSell(storeId: string) {
  const since = new Date(Date.now() - 183 * DAY);
  const sales = await prisma.sale.findMany({
    where: { storeId, status: "COMPLETED", date: { gte: since } },
    select: { date: true, vehicle: { select: { createdAt: true, purchaseDate: true } } },
  });
  if (!sales.length) return null;
  const total = sales.reduce((s, x) => s + Math.max(0, (x.date.getTime() - (x.vehicle.purchaseDate ?? x.vehicle.createdAt).getTime()) / DAY), 0);
  return { days: Math.round(total / sales.length), count: sales.length };
}
