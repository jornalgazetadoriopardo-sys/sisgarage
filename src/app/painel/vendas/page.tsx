import Link from "next/link";
import { BadgeDollarSign, CalendarCheck, ChevronRight, Handshake, Plus, ReceiptText, TrendingUp } from "lucide-react";
import type { Prisma, SaleStatus } from "@prisma/client";
import { canSeeFinance, requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { vehicleFinance } from "@/lib/finance";
import { formatDay, formatMoney, vehicleTitle } from "@/lib/format";
import { saleStatusLabels } from "@/lib/labels";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";

const chip = { RESERVED: "bg-amber-50 text-amber-700", COMPLETED: "bg-emerald-50 text-emerald-700", CANCELED: "bg-red-50 text-red-700" } as const;

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = await requireStoreUser();
  const { status } = await searchParams;
  const finance = canSeeFinance(ctx);
  const filter = status && status in saleStatusLabels ? (status as SaleStatus) : undefined;
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

  const where: Prisma.SaleWhereInput = { storeId: ctx.storeId, ...(filter ? { status: filter } : {}) };
  const [sales, monthSales, reserved] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: [{ date: "desc" }, { number: "desc" }],
      take: 200,
      include: {
        customer: { select: { name: true } },
        vehicle: { select: { brand: true, model: true, version: true, yearModel: true } },
        payments: { select: { amount: true, paidAt: true } },
      },
    }),
    prisma.sale.findMany({
      where: { storeId: ctx.storeId, status: "COMPLETED", date: { gte: monthStart } },
      select: {
        price: true, commission: true,
        vehicle: { select: { purchasePrice: true, fipeValue: true, expenses: { select: { amount: true } }, taxes: { select: { amount: true, paidAt: true } } } },
      },
    }),
    prisma.sale.count({ where: { storeId: ctx.storeId, status: "RESERVED" } }),
  ]);
  const revenue = monthSales.reduce((s, x) => s + Number(x.price), 0);
  const profit = monthSales.reduce((s, x) => s + vehicleFinance({ ...x.vehicle, price: x.price }).profit - Number(x.commission ?? 0), 0);
  const month = new Date().toLocaleDateString("pt-BR", { month: "long" });

  return (
    <div className="space-y-8">
      <PageHeader title="Vendas" subtitle="Vendas, reservas e documentos." actions={<Link href="/painel/vendas/nova" className="btn-primary"><Plus className="h-4 w-4" /> Nova venda</Link>} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={Handshake} label={`Vendas em ${month}`} value={monthSales.length} />
        <StatCard icon={BadgeDollarSign} tone="violet" label={`Faturamento em ${month}`} value={formatMoney(revenue)} />
        {finance && <StatCard icon={TrendingUp} tone={profit >= 0 ? "green" : "red"} label={`Lucro em ${month}`} value={formatMoney(profit)} hint="Após custos e comissões" />}
        <StatCard icon={CalendarCheck} tone="amber" label="Reservas em aberto" value={reserved} href="/painel/vendas?status=RESERVED" />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {([["", "Todas"], ...Object.entries(saleStatusLabels)] as [string, string][]).map(([k, label]) => (
          <Link key={k} href={k ? `/painel/vendas?status=${k}` : "/painel/vendas"}
            className={`btn shrink-0 border ${(status ?? "") === k ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
            {label}
          </Link>
        ))}
      </div>

      {sales.length === 0 ? (
        <div className="card">
          <EmptyState icon={ReceiptText} title="Nenhuma venda aqui" text="Registre uma venda pelo botão acima ou direto na página do veículo."
            action={<Link href="/painel/vendas/nova" className="btn-primary"><Plus className="h-4 w-4" /> Nova venda</Link>} />
        </div>
      ) : (
        <ul className="space-y-3">
          {sales.map((s) => {
            const open = Number(s.price) - s.payments.filter((p) => p.paidAt).reduce((t, p) => t + Number(p.amount), 0);
            return (
              <li key={s.id}>
                <Link href={`/painel/vendas/${s.id}`} className="card flex items-center gap-4 p-4 transition hover:border-slate-300 sm:p-5">
                  <span className="icon-box h-11 w-11 bg-slate-100 text-sm font-bold text-slate-600">{s.number}</span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-semibold text-slate-900">{vehicleTitle(s.vehicle)} {s.vehicle.yearModel}</p>
                    <p className="truncate text-sm text-slate-500">{s.customer.name} · {formatDay(s.date)}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`badge ${chip[s.status]}`}>{saleStatusLabels[s.status]}</span>
                      {s.status !== "CANCELED" && open > 0.005 && <span className="badge bg-slate-100 text-slate-600">{formatMoney(open)} a receber</span>}
                    </div>
                  </div>
                  <span className="hidden text-lg font-bold text-slate-900 sm:block">{formatMoney(Number(s.price))}</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
