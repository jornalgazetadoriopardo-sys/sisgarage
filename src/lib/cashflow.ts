import "server-only";
import { prisma } from "./db";
import { vehicleFinance } from "./finance";
import { vehicleTitle } from "./format";
import { expenseCategoryLabels, paymentMethodLabels, taxKindLabels } from "./labels";

export type Movement = {
  key: string;
  source: "manual" | "sale" | "purchase" | "expense" | "tax" | "commission";
  type: "INCOME" | "EXPENSE";
  description: string;
  category: string;
  amount: number;
  dueDate: Date;
  paidAt: Date | null;
  href?: string;
  entryId?: string; // lançamento manual (permite marcar pago/excluir)
  taxId?: string;
  paymentId?: string;
};

const num = (v: { toString(): string } | null | undefined) => (v ? Number(v.toString()) : 0);

/**
 * Todas as entradas e saídas da loja num período, juntando lançamentos manuais
 * com o que já existe no sistema (vendas, compras, gastos, IPVA, comissões).
 * Um movimento entra no período se vence OU foi pago dentro dele.
 */
export async function loadMovements(storeId: string, start: Date, end: Date): Promise<Movement[]> {
  const inRange = { gte: start, lt: end };
  const [entries, payments, purchases, expenses, taxes, commissions] = await Promise.all([
    prisma.financialEntry.findMany({ where: { storeId, OR: [{ dueDate: inRange }, { paidAt: inRange }] } }),
    prisma.salePayment.findMany({
      where: {
        method: { not: "TRADE_IN" },
        sale: { storeId, status: { not: "CANCELED" } },
        OR: [{ paidAt: inRange }, { paidAt: null, dueDate: inRange }, { paidAt: null, dueDate: null, sale: { date: inRange } }],
      },
      include: { sale: { select: { id: true, number: true, date: true, customer: { select: { name: true } } } } },
    }),
    prisma.vehicle.findMany({
      where: { storeId, purchasePrice: { not: null }, purchaseDate: inRange, NOT: { purchaseSource: "TRADE_IN" } },
      select: { id: true, brand: true, model: true, version: true, purchasePrice: true, purchaseDate: true },
    }),
    prisma.vehicleExpense.findMany({
      where: { vehicle: { storeId }, date: inRange },
      include: { vehicle: { select: { id: true, brand: true, model: true, version: true } } },
    }),
    prisma.vehicleTax.findMany({
      where: { vehicle: { storeId }, OR: [{ paidAt: inRange }, { paidAt: null, dueDate: inRange }] },
      include: { vehicle: { select: { id: true, brand: true, model: true, version: true } } },
    }),
    prisma.sale.findMany({
      where: { storeId, status: "COMPLETED", commission: { gt: 0 }, date: inRange },
      select: { id: true, number: true, date: true, commission: true, sellerName: true },
    }),
  ]);

  const list: Movement[] = [
    ...entries.map((e) => ({
      key: `m-${e.id}`, source: "manual" as const, type: e.type, description: e.description, category: e.category,
      amount: num(e.amount), dueDate: e.dueDate, paidAt: e.paidAt, entryId: e.id,
    })),
    ...payments.map((p) => ({
      key: `p-${p.id}`, source: "sale" as const, type: "INCOME" as const,
      description: `Venda nº ${p.sale.number} · ${p.sale.customer.name}${p.details ? ` · ${p.details}` : ""}`,
      category: `Venda (${paymentMethodLabels[p.method]})`, amount: num(p.amount),
      dueDate: p.dueDate ?? p.sale.date, paidAt: p.paidAt, href: `/painel/vendas/${p.sale.id}`, paymentId: p.id,
    })),
    ...purchases.map((v) => ({
      key: `c-${v.id}`, source: "purchase" as const, type: "EXPENSE" as const, description: `Compra: ${vehicleTitle(v)}`,
      category: "Compra de veículo", amount: num(v.purchasePrice), dueDate: v.purchaseDate!, paidAt: v.purchaseDate,
      href: `/painel/veiculos/${v.id}?aba=gestao`,
    })),
    ...expenses.map((e) => ({
      key: `g-${e.id}`, source: "expense" as const, type: "EXPENSE" as const, description: `${e.description} · ${vehicleTitle(e.vehicle)}`,
      category: `Preparação (${expenseCategoryLabels[e.category]})`, amount: num(e.amount), dueDate: e.date, paidAt: e.date,
      href: `/painel/veiculos/${e.vehicle.id}?aba=gestao`,
    })),
    ...taxes.map((t) => ({
      key: `t-${t.id}`, source: "tax" as const, type: "EXPENSE" as const,
      description: `${taxKindLabels[t.kind]}${t.description ? ` · ${t.description}` : ""} · ${vehicleTitle(t.vehicle)}`,
      category: "IPVA, licenciamento e multas", amount: num(t.amount), dueDate: t.dueDate ?? t.paidAt ?? t.createdAt, paidAt: t.paidAt,
      href: `/painel/veiculos/${t.vehicle.id}?aba=gestao`, taxId: t.id,
    })),
    ...commissions.map((s) => ({
      key: `k-${s.id}`, source: "commission" as const, type: "EXPENSE" as const, description: `Comissão venda nº ${s.number} · ${s.sellerName}`,
      category: "Comissões", amount: num(s.commission), dueDate: s.date, paidAt: s.date, href: `/painel/vendas/${s.id}`,
    })),
  ];
  return list.sort((a, b) => (a.paidAt ?? a.dueDate).getTime() - (b.paidAt ?? b.dueDate).getTime());
}

/** Contas em aberto (a pagar e a receber), de qualquer data, até `until`. */
export async function loadOpen(storeId: string, until: Date) {
  const all = await loadMovements(storeId, new Date(Date.UTC(2000, 0, 1)), until);
  return all.filter((m) => !m.paidAt);
}

/** Resultado do mês por competência (data da venda / vencimento da despesa). */
export async function monthResult(storeId: string, start: Date, end: Date) {
  const [sales, entries] = await Promise.all([
    prisma.sale.findMany({
      where: { storeId, status: "COMPLETED", date: { gte: start, lt: end } },
      select: {
        price: true, commission: true,
        vehicle: { select: { purchasePrice: true, fipeValue: true, expenses: { select: { amount: true } }, taxes: { select: { amount: true, paidAt: true } } } },
      },
    }),
    prisma.financialEntry.findMany({ where: { storeId, dueDate: { gte: start, lt: end } } }),
  ]);
  const revenue = sales.reduce((s, x) => s + num(x.price), 0);
  const cogs = sales.reduce((s, x) => s + vehicleFinance({ ...x.vehicle, price: x.price }).cost, 0);
  const commissions = sales.reduce((s, x) => s + num(x.commission), 0);
  const byCategory = new Map<string, number>();
  let otherIncome = 0;
  for (const e of entries) {
    if (e.type === "INCOME") otherIncome += num(e.amount);
    else byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + num(e.amount));
  }
  const operating = [...byCategory.values()].reduce((s, v) => s + v, 0);
  const gross = revenue - cogs - commissions;
  return {
    salesCount: sales.length,
    revenue,
    cogs,
    commissions,
    gross,
    operating,
    otherIncome,
    result: gross - operating + otherIncome,
    categories: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
  };
}
