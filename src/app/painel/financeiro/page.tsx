import Link from "next/link";
import {
  ArrowDownCircle, ArrowUpCircle, BarChart3, ChevronLeft, ChevronRight, ExternalLink, Landmark, Scale, TrendingUp, Wallet,
} from "lucide-react";
import { requireStoreOwner } from "@/lib/auth";
import { loadMovements, loadOpen, monthResult, type Movement } from "@/lib/cashflow";
import { formatDay, formatMoney } from "@/lib/format";
import { currentMonth, monthLabel, monthRange, shiftMonth, todayLocal } from "@/lib/time";
import { EntryForm } from "@/components/finance/EntryForm";
import { MovementActions } from "@/components/finance/MovementActions";
import { EmptyState, PageHeader, Section, StatCard } from "@/components/ui";
import { prisma } from "@/lib/db";

const TABS = [
  ["fluxo", "Fluxo de caixa"],
  ["pagar", "A pagar"],
  ["receber", "A receber"],
  ["resultado", "Resultado"],
] as const;

function MovementList({ items, today, groups }: { items: Movement[]; today: Date; groups: Set<string> }) {
  if (items.length === 0) return <EmptyState icon={Wallet} title="Nada por aqui" text="Nenhum lançamento neste filtro." />;
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((m) => {
        const overdue = !m.paidAt && m.dueDate < today;
        const Icon = m.type === "INCOME" ? ArrowUpCircle : ArrowDownCircle;
        return (
          <li key={m.key} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${m.type === "INCOME" ? "text-emerald-500" : "text-red-500"}`} />
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-slate-800">
                  {m.href ? <Link href={m.href} className="hover:text-brand-600">{m.description} <ExternalLink className="inline h-3 w-3 text-slate-400" /></Link> : m.description}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="badge bg-slate-100 text-slate-600">{m.category}</span>
                  {m.paidAt ? (
                    <span className="badge bg-emerald-50 text-emerald-700">{m.type === "INCOME" ? "Recebido" : "Pago"} {formatDay(m.paidAt)}</span>
                  ) : (
                    <span className={`badge ${overdue ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{overdue ? "Vencido" : "Vence"} {formatDay(m.dueDate)}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 pl-8 sm:pl-0">
              <span className={`font-semibold ${m.type === "INCOME" ? "text-emerald-700" : "text-slate-900"}`}>
                {m.type === "INCOME" ? "+" : "−"} {formatMoney(m.amount)}
              </span>
              <MovementActions entryId={m.entryId} taxId={m.taxId} paymentId={m.paymentId} paid={Boolean(m.paidAt)} grouped={m.entryId ? groups.has(m.entryId) : false} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ mes?: string; aba?: string }> }) {
  const { storeId } = await requireStoreOwner();
  const sp = await searchParams;
  const month = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : currentMonth();
  const tab = TABS.some(([k]) => k === sp.aba) ? sp.aba! : "fluxo";
  const { start, end } = monthRange(month);
  const today = new Date(`${todayLocal()}T00:00:00Z`);
  const in60 = new Date(today.getTime() + 60 * 86_400_000);

  const sixStart = monthRange(shiftMonth(month, -5)).start;
  const [movements, open, result, history, grouped] = await Promise.all([
    loadMovements(storeId, start, end),
    loadOpen(storeId, in60),
    monthResult(storeId, start, end),
    loadMovements(storeId, sixStart, end),
    prisma.financialEntry.findMany({ where: { storeId, groupId: { not: null } }, select: { id: true } }),
  ]);
  const groups = new Set(grouped.map((g) => g.id));

  const realized = movements.filter((m) => m.paidAt && m.paidAt >= start && m.paidAt < end);
  const income = realized.filter((m) => m.type === "INCOME").reduce((s, m) => s + m.amount, 0);
  const expense = realized.filter((m) => m.type === "EXPENSE").reduce((s, m) => s + m.amount, 0);
  const payables = open.filter((m) => m.type === "EXPENSE");
  const receivables = open.filter((m) => m.type === "INCOME");
  const overduePay = payables.filter((m) => m.dueDate < today).reduce((s, m) => s + m.amount, 0);
  const sum = (l: Movement[]) => l.reduce((s, m) => s + m.amount, 0);

  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5)).map((mm) => {
    const r = monthRange(mm);
    const paid = history.filter((m) => m.paidAt && m.paidAt >= r.start && m.paidAt < r.end);
    return { month: mm, in: sum(paid.filter((m) => m.type === "INCOME")), out: sum(paid.filter((m) => m.type === "EXPENSE")) };
  });
  const max = Math.max(1, ...months.flatMap((m) => [m.in, m.out]));
  const link = (p: Record<string, string>) => `/painel/financeiro?${new URLSearchParams({ mes: month, aba: tab, ...p })}`;

  return (
    <div className="space-y-8">
      <PageHeader title="Financeiro" subtitle="Vendas, compras, gastos e IPVA entram sozinhos. Aqui você lança as despesas da loja." actions={<EntryForm today={todayLocal()} />} />

      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200/80">
        <Link href={link({ mes: shiftMonth(month, -1) })} className="btn-ghost px-3" aria-label="Mês anterior"><ChevronLeft className="h-5 w-5" /></Link>
        <p className="font-semibold capitalize text-slate-800">{monthLabel(month)}</p>
        <Link href={link({ mes: shiftMonth(month, 1) })} className="btn-ghost px-3" aria-label="Próximo mês"><ChevronRight className="h-5 w-5" /></Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={ArrowUpCircle} tone="green" label="Entradas no mês" value={formatMoney(income)} />
        <StatCard icon={ArrowDownCircle} tone="red" label="Saídas no mês" value={formatMoney(expense)} />
        <StatCard icon={Scale} tone={income - expense >= 0 ? "blue" : "red"} label="Saldo do mês" value={formatMoney(income - expense)} />
        <StatCard icon={Landmark} tone="amber" label="A pagar (60 dias)" value={formatMoney(sum(payables))} hint={overduePay ? `${formatMoney(overduePay)} vencido` : "Nada vencido"} href={link({ aba: "pagar" })} />
      </div>

      <Section icon={BarChart3} tone="blue" title="Últimos 6 meses" description="Entradas e saídas efetivamente pagas/recebidas.">
        <div className="flex h-44 items-end gap-3 sm:gap-6">
          {months.map((m) => (
            <Link key={m.month} href={link({ mes: m.month })} className="flex h-full flex-1 flex-col items-center justify-end gap-2" title={`${monthLabel(m.month)}: +${formatMoney(m.in)} / −${formatMoney(m.out)}`}>
              <div className="flex h-full w-full items-end justify-center gap-1">
                <span className="w-1/2 max-w-6 rounded-t-md bg-emerald-400" style={{ height: `${Math.max(2, (m.in / max) * 100)}%` }} />
                <span className="w-1/2 max-w-6 rounded-t-md bg-red-300" style={{ height: `${Math.max(2, (m.out / max) * 100)}%` }} />
              </div>
              <span className={`text-xs capitalize ${m.month === month ? "font-bold text-slate-900" : "text-slate-500"}`}>
                {new Date(`${m.month}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "")}
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-4 flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-emerald-400" /> Entradas</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-red-300" /> Saídas</span>
        </div>
      </Section>

      <nav className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-200/60 p-1">
        {TABS.map(([k, label]) => (
          <Link key={k} href={link({ aba: k })} className={`flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-center text-sm font-semibold ${tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
            {label}
          </Link>
        ))}
      </nav>

      {tab === "fluxo" && (
        <Section icon={Wallet} tone="blue" title="Movimentações do mês" description="Tudo que venceu ou foi pago neste mês.">
          <MovementList items={movements} today={today} groups={groups} />
        </Section>
      )}
      {tab === "pagar" && (
        <Section icon={ArrowDownCircle} tone="red" title="Contas a pagar" description={`Em aberto até os próximos 60 dias: ${formatMoney(sum(payables))}.`}>
          <MovementList items={payables} today={today} groups={groups} />
        </Section>
      )}
      {tab === "receber" && (
        <Section icon={ArrowUpCircle} tone="green" title="Contas a receber" description={`Parcelas de vendas e receitas em aberto: ${formatMoney(sum(receivables))}.`}>
          <MovementList items={receivables} today={today} groups={groups} />
        </Section>
      )}
      {tab === "resultado" && (
        <Section icon={TrendingUp} tone="violet" title={`Resultado de ${monthLabel(month)}`} description="Pela data da venda e pelo vencimento das despesas (regime de competência).">
          <dl className="divide-y divide-slate-100 text-sm">
            {([
              [`Receita de vendas (${result.salesCount})`, result.revenue, "pos"],
              ["(−) Custo dos veículos vendidos", -result.cogs, ""],
              ["(−) Comissões", -result.commissions, ""],
              ["= Lucro bruto", result.gross, "total"],
              ...result.categories.map(([c, v]) => [`(−) ${c}`, -v, "sub"] as [string, number, string]),
              ["(+) Outras receitas", result.otherIncome, ""],
              ["= Resultado do mês", result.result, "total"],
            ] as [string, number, string][]).map(([label, value, kind]) => (
              <div key={label} className={`flex items-center justify-between gap-4 py-3 ${kind === "total" ? "font-bold text-slate-900" : kind === "sub" ? "pl-4 text-slate-500" : "text-slate-700"}`}>
                <dt>{label}</dt>
                <dd className={value < 0 ? "text-red-600" : kind === "total" ? "text-slate-900" : ""}>{formatMoney(value)}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
    </div>
  );
}
