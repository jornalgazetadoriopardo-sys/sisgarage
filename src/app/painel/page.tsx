import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle, BadgeDollarSign, CalendarClock, CalendarDays, Camera, Car, ChevronRight, FileWarning, Gauge, Handshake, Hourglass,
  MessageSquare, PiggyBank, Plus, Sparkles, TrendingUp, Wallet,
} from "lucide-react";
import { canSeeFinance, requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { daysSince, vehicleFinance } from "@/lib/finance";
import { formatDate, formatMoney, vehicleTitle, whatsappLink } from "@/lib/format";
import { IconBox, PageHeader, Section, StatCard, type Tone } from "@/components/ui";
import { appointmentTypeLabels } from "@/lib/labels";
import { addDays, localTime, startOfLocalDay, todayLocal } from "@/lib/time";

const STALE_DAYS = 90;

type Alert = { icon: LucideIcon; tone: Tone; title: string; text: string; href: string };

export default async function PanelHome({ searchParams }: { searchParams: Promise<{ bemvindo?: string }> }) {
  const ctx = await requireStoreUser();
  const { storeId, user, store } = ctx;
  const finance = canSeeFinance(ctx);
  const { bemvindo } = await searchParams;

  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const in30 = new Date(today.getTime() + 30 * 86_400_000);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const todayStr = todayLocal();
  const [todayAppointments, siteRequests, followUps, overdueBills] = await Promise.all([
    prisma.appointment.findMany({
      where: { storeId, status: "SCHEDULED", startsAt: { gte: startOfLocalDay(todayStr), lt: startOfLocalDay(addDays(todayStr, 1)) } },
      orderBy: { startsAt: "asc" },
      include: { vehicle: { select: { brand: true, model: true } } },
    }),
    prisma.appointment.count({ where: { storeId, status: "REQUESTED" } }),
    prisma.lead.count({ where: { storeId, nextFollowUp: { lte: today }, status: { notIn: ["WON", "LOST"] } } }),
    finance ? prisma.financialEntry.count({ where: { storeId, type: "EXPENSE", paidAt: null, dueDate: { lt: today } } }) : Promise.resolve(0),
  ]);
  const [stock, unreadLeads, newLeads, leads, monthSales, reservations, overdueInstallments] = await Promise.all([
    prisma.vehicle.findMany({
      where: { storeId, status: { not: "SOLD" } },
      select: {
        id: true, brand: true, model: true, version: true, status: true, published: true, price: true,
        purchasePrice: true, purchaseDate: true, fipeValue: true, createdAt: true,
        _count: { select: { photos: true } },
        expenses: { select: { amount: true } },
        taxes: { select: { amount: true, paidAt: true, dueDate: true } },
        documents: { select: { status: true, expiresAt: true } },
      },
    }),
    prisma.lead.count({ where: { storeId, read: false } }),
    prisma.lead.count({ where: { storeId, createdAt: { gte: weekAgo } } }),
    prisma.lead.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { vehicle: { select: { brand: true, model: true, version: true } } },
    }),
    prisma.sale.findMany({
      where: { storeId, status: "COMPLETED", date: { gte: monthStart } },
      select: { price: true, commission: true, vehicle: { select: { purchasePrice: true, fipeValue: true, expenses: { select: { amount: true } }, taxes: { select: { amount: true, paidAt: true } } } } },
    }),
    prisma.sale.findMany({ where: { storeId, status: "RESERVED" }, select: { id: true } }),
    prisma.salePayment.findMany({
      where: { paidAt: null, dueDate: { lt: today }, sale: { storeId, status: { not: "CANCELED" } } },
      select: { saleId: true },
    }),
  ]);
  const monthRevenue = monthSales.reduce((s, x) => s + Number(x.price), 0);
  const monthProfit = monthSales.reduce((s, x) => s + vehicleFinance({ ...x.vehicle, price: x.price }).profit - Number(x.commission ?? 0), 0);

  const forSale = stock.filter((v) => v.status === "AVAILABLE" || v.status === "RESERVED");
  const fin = stock.map((v) => ({ v, f: vehicleFinance(v) }));
  const invested = fin.reduce((s, x) => s + x.f.cost, 0);
  const expectedProfit = fin.filter((x) => x.f.cost > 0).reduce((s, x) => s + x.f.profit, 0);
  const stockValue = forSale.reduce((s, v) => s + Number(v.price), 0);

  // ----- O que precisa de atenção (mais importante primeiro) -----
  const overdue = stock.flatMap((v) => v.taxes.filter((t) => !t.paidAt && t.dueDate && t.dueDate < today).map(() => v));
  const dueSoon = stock.flatMap((v) => v.taxes.filter((t) => !t.paidAt && t.dueDate && t.dueDate >= today && t.dueDate <= in30).map(() => v));
  const docsPending = stock.filter((v) => v.documents.some((d) => d.status === "PENDING"));
  const docsExpiring = stock.filter((v) => v.documents.some((d) => d.expiresAt && d.expiresAt <= in30));
  const noPhotos = stock.filter((v) => v._count.photos === 0);
  const stale = stock.filter((v) => daysSince(v.purchaseDate ?? v.createdAt) > STALE_DAYS);

  const first = (list: typeof stock, tab = "") => (list.length === 1 ? `/painel/veiculos/${list[0].id}${tab}` : "/painel/veiculos");
  const alerts: Alert[] = [];
  if (overdue.length) alerts.push({ icon: AlertTriangle, tone: "red", title: `${overdue.length} débito(s) vencido(s)`, text: "IPVA, licenciamento ou multas com vencimento passado.", href: first([...new Set(overdue)], "?aba=gestao") });
  if (overdueBills) alerts.push({ icon: AlertTriangle, tone: "red", title: `${overdueBills} conta(s) da loja vencida(s)`, text: "Despesas lançadas no financeiro e ainda não pagas.", href: "/painel/financeiro?aba=pagar" });
  if (siteRequests) alerts.push({ icon: CalendarClock, tone: "violet", title: `${siteRequests} pedido(s) de agendamento pelo site`, text: "Clientes querendo test drive ou visita. Confirme o horário.", href: "/painel/agenda" });
  if (followUps) alerts.push({ icon: MessageSquare, tone: "blue", title: `${followUps} contato(s) para retornar hoje`, text: "Retornos marcados no acompanhamento dos contatos.", href: "/painel/contatos?filtro=retornar" });
  if (overdueInstallments.length) {
    const ids = [...new Set(overdueInstallments.map((p) => p.saleId))];
    alerts.push({ icon: AlertTriangle, tone: "red", title: `${overdueInstallments.length} parcela(s) de venda atrasada(s)`, text: "Financiamentos ou promissórias com vencimento passado.", href: ids.length === 1 ? `/painel/vendas/${ids[0]}` : "/painel/vendas" });
  }
  if (reservations.length) alerts.push({ icon: CalendarClock, tone: "amber", title: `${reservations.length} reserva(s) aguardando conclusão`, text: "Clientes que pagaram sinal. Conclua a venda quando fechar.", href: reservations.length === 1 ? `/painel/vendas/${reservations[0].id}` : "/painel/vendas?status=RESERVED" });
  if (unreadLeads) alerts.push({ icon: MessageSquare, tone: "blue", title: `${unreadLeads} contato(s) sem resposta`, text: "Compradores aguardando retorno.", href: "/painel/contatos" });
  if (dueSoon.length) alerts.push({ icon: CalendarClock, tone: "amber", title: `${dueSoon.length} débito(s) vencem em 30 dias`, text: "Programe o pagamento para não perder o prazo.", href: first([...new Set(dueSoon)], "?aba=gestao") });
  if (docsExpiring.length) alerts.push({ icon: FileWarning, tone: "amber", title: `${docsExpiring.length} veículo(s) com documento vencendo`, text: "Laudos ou vistorias perto do vencimento.", href: first(docsExpiring, "?aba=gestao") });
  if (docsPending.length) alerts.push({ icon: FileWarning, tone: "amber", title: `${docsPending.length} veículo(s) com documentação pendente`, text: "Itens da lista de verificação ainda não conferidos.", href: first(docsPending, "?aba=gestao") });
  if (noPhotos.length) alerts.push({ icon: Camera, tone: "violet", title: `${noPhotos.length} veículo(s) sem foto`, text: "Anúncios com fotos recebem muito mais contatos.", href: first(noPhotos, "?aba=fotos") });
  if (stale.length) alerts.push({ icon: Hourglass, tone: "slate", title: `${stale.length} veículo(s) há mais de ${STALE_DAYS} dias no estoque`, text: "Revise preço ou destaque esses anúncios.", href: "/painel/veiculos" });

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0]}`}
        subtitle={bemvindo ? "Loja cadastrada! Comece incluindo os veículos do estoque." : "Este é o resumo da sua loja hoje."}
        actions={
          <Link href="/painel/veiculos/novo" className="btn-primary hidden lg:inline-flex">
            <Plus className="h-4 w-4" /> Novo veículo
          </Link>
        }
      />

      {/* Números principais */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={Car} label="À venda" value={forSale.length} hint={`${stock.length - forSale.length} em preparação`} href="/painel/veiculos" />
        <StatCard icon={Handshake} tone="green" label={`Vendas em ${today.toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" })}`} value={monthSales.length} hint={formatMoney(monthRevenue)} href="/painel/vendas" />
        {finance ? (
          <>
            <StatCard icon={TrendingUp} tone={monthProfit >= 0 ? "green" : "red"} label="Lucro do mês" value={formatMoney(monthProfit)} hint={`Previsto no estoque: ${formatMoney(expectedProfit)}`} href="/painel/vendas" />
            <StatCard icon={Wallet} tone="violet" label="Investido no estoque" value={formatMoney(invested)} hint="Compra + gastos + débitos" />
          </>
        ) : (
          <>
            <StatCard icon={MessageSquare} tone="green" label="Contatos (7 dias)" value={newLeads} hint={unreadLeads ? `${unreadLeads} sem resposta` : "Todos respondidos"} href="/painel/contatos" />
            <StatCard icon={BadgeDollarSign} tone="violet" label="Valor do estoque à venda" value={formatMoney(stockValue)} />
          </>
        )}
      </div>

      {todayAppointments.length > 0 && (
        <Section icon={CalendarDays} tone="blue" title={`Hoje na agenda (${todayAppointments.length})`}
          actions={<Link href="/painel/agenda" className="btn-ghost">Abrir agenda <ChevronRight className="h-4 w-4" /></Link>}>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {todayAppointments.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                <span className="rounded-lg bg-brand-50 px-2.5 py-1.5 text-sm font-bold text-brand-700">{localTime(a.startsAt)}</span>
                <div className="min-w-0 text-sm">
                  <p className="truncate font-medium text-slate-800">{appointmentTypeLabels[a.type]}{a.vehicle ? ` · ${a.vehicle.model}` : ""}</p>
                  <p className="truncate text-slate-500">{a.contactName ?? a.title ?? ""}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Atenção */}
        <Section icon={Sparkles} tone="amber" title="Precisa de atenção" description="Em ordem de prioridade." className="lg:col-span-3">
          {alerts.length === 0 ? (
            <p className="rounded-xl bg-emerald-50 px-4 py-6 text-center text-sm font-medium text-emerald-700">Tudo em dia por aqui. 🎉</p>
          ) : (
            <ul className="space-y-3">
              {alerts.map((a) => (
                <li key={a.title}>
                  <Link href={a.href} className="flex items-center gap-4 rounded-xl border border-slate-100 p-4 transition hover:border-slate-200 hover:bg-slate-50">
                    <IconBox icon={a.icon} tone={a.tone} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800">{a.title}</p>
                      <p className="text-sm text-slate-500">{a.text}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Atalhos */}
        <Section icon={PiggyBank} tone="blue" title="Atalhos" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/painel/veiculos/novo", icon: Plus, label: "Cadastrar veículo" },
              { href: "/painel/vendas/nova", icon: Handshake, label: "Registrar venda" },
              { href: "/painel/fipe", icon: Gauge, label: "Tabela FIPE" },
              ...(store.status === "ACTIVE" ? [{ href: `/lojas/${store.slug}`, icon: Car, label: "Ver vitrine" }] : []),
            ].map((a) => (
              <Link key={a.href} href={a.href} className="flex flex-col items-start gap-3 rounded-xl border border-slate-100 p-4 transition hover:border-brand-200 hover:bg-brand-50/50">
                <a.icon className="h-5 w-5 text-brand-600" />
                <span className="text-sm font-medium text-slate-700">{a.label}</span>
              </Link>
            ))}
          </div>
        </Section>
      </div>

      <Section
        icon={MessageSquare}
        tone="green"
        title="Últimos contatos"
        actions={<Link href="/painel/contatos" className="btn-ghost">Ver todos <ChevronRight className="h-4 w-4" /></Link>}
      >
        {leads.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Nenhum contato recebido ainda. Eles aparecem aqui quando alguém escreve pelo site.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {leads.map((l) => (
              <li key={l.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">
                    {l.name} {!l.read && <span className="badge ml-1 bg-brand-100 text-brand-700">Novo</span>}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {l.vehicle ? vehicleTitle(l.vehicle) : "Contato geral"} · {formatDate(l.createdAt)}
                  </p>
                </div>
                <a className="btn-secondary self-start sm:self-auto" target="_blank" rel="noopener noreferrer" href={whatsappLink(l.phone)}>
                  Responder
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
