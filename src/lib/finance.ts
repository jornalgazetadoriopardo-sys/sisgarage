import type { Prisma } from "@prisma/client";

type Dec = Prisma.Decimal | number | string | null | undefined;
const n = (v: Dec) => (v === null || v === undefined ? 0 : Number(v.toString()));

export type VehicleFinance = {
  purchase: number;
  expenses: number;
  taxes: number;
  taxesOpen: number;
  cost: number;
  price: number;
  profit: number;
  margin: number | null; // % sobre o custo
  fipe: number | null;
  priceVsFipe: number | null; // % do preço em relação à FIPE
};

/** Custo total = compra + gastos + impostos/multas. Lucro previsto = preço de venda − custo. */
export function vehicleFinance(v: {
  price: Dec;
  purchasePrice: Dec;
  fipeValue: Dec;
  expenses: { amount: Dec }[];
  taxes: { amount: Dec; paidAt: Date | null }[];
}): VehicleFinance {
  const purchase = n(v.purchasePrice);
  const expenses = v.expenses.reduce((s, e) => s + n(e.amount), 0);
  const taxes = v.taxes.reduce((s, t) => s + n(t.amount), 0);
  const taxesOpen = v.taxes.filter((t) => !t.paidAt).reduce((s, t) => s + n(t.amount), 0);
  const cost = purchase + expenses + taxes;
  const price = n(v.price);
  const fipe = v.fipeValue === null || v.fipeValue === undefined ? null : n(v.fipeValue);
  return {
    purchase,
    expenses,
    taxes,
    taxesOpen,
    cost,
    price,
    profit: price - cost,
    margin: cost > 0 ? ((price - cost) / cost) * 100 : null,
    fipe,
    priceVsFipe: fipe ? ((price - fipe) / fipe) * 100 : null,
  };
}

export function daysSince(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}
