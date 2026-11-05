import Link from "next/link";
import type { LeadStatus, Prisma } from "@prisma/client";
import { CalendarClock, Car, MessageCircle, MessageSquare, Plus, Search } from "lucide-react";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDay, formatPhone, onlyDigits, whatsappLink } from "@/lib/format";
import { leadSourceLabels, leadStatusLabels } from "@/lib/labels";
import { todayLocal } from "@/lib/time";
import { LeadStage } from "@/components/crm/LeadStage";
import { EmptyState, PageHeader } from "@/components/ui";

const COLUMNS: { key: LeadStatus; tone: string }[] = [
  { key: "NEW", tone: "bg-brand-500" },
  { key: "CONTACTED", tone: "bg-sky-400" },
  { key: "NEGOTIATING", tone: "bg-amber-400" },
  { key: "WON", tone: "bg-emerald-500" },
  { key: "LOST", tone: "bg-slate-300" },
];

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string; etapa?: string; filtro?: string }> }) {
  const { storeId, user, asAdmin } = await requireStoreUser();
  const sp = await searchParams;
  const today = new Date(`${todayLocal()}T00:00:00Z`);
  const where: Prisma.LeadWhereInput = { storeId };
  const q = sp.q?.trim();
  if (q) {
    const d = onlyDigits(q);
    where.OR = [{ name: { contains: q } }, ...(d.length >= 3 ? [{ phone: { contains: d } }] : [])];
  }
  if (sp.filtro === "meus" && !asAdmin) where.assignedToId = user.id;
  if (sp.filtro === "retornar") Object.assign(where, { nextFollowUp: { lte: today }, status: { notIn: ["WON", "LOST"] as LeadStatus[] } });

  const leads = await prisma.lead.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    take: 300,
    include: {
      vehicle: { select: { brand: true, model: true, yearModel: true } },
      _count: { select: { notes: true } },
    },
  });
  const stage = (sp.etapa && sp.etapa in leadStatusLabels ? sp.etapa : "NEW") as LeadStatus;
  const followUps = await prisma.lead.count({ where: { storeId, nextFollowUp: { lte: today }, status: { notIn: ["WON", "LOST"] } } });
  const qs = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: sp.q, filtro: sp.filtro, etapa: sp.etapa, ...p })) if (v) u.set(k, v);
    return `/painel/contatos?${u}`;
  };

  type L = (typeof leads)[number];
  const card = (l: L) => {
    const late = l.nextFollowUp && l.nextFollowUp <= today && l.status !== "WON" && l.status !== "LOST";
    return (
      <li key={l.id} className={`card space-y-3 p-4 ${!l.read ? "border-l-4 border-l-brand-500" : ""}`}>
        <Link href={`/painel/contatos/${l.id}`} className="block space-y-1">
          <p className="font-semibold text-slate-900">{l.name}</p>
          <p className="text-sm text-slate-500">{formatPhone(l.phone)}</p>
          {l.vehicle && <p className="flex items-center gap-1.5 text-xs text-slate-500"><Car className="h-3.5 w-3.5" /> {l.vehicle.brand} {l.vehicle.model} {l.vehicle.yearModel}</p>}
        </Link>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="badge bg-slate-100 text-slate-600">{leadSourceLabels[l.source]}</span>
          {l.nextFollowUp && l.status !== "WON" && l.status !== "LOST" && (
            <span className={`badge ${late ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}><CalendarClock className="h-3 w-3" /> {formatDay(l.nextFollowUp)}</span>
          )}
          {l._count.notes > 0 && <span className="badge bg-slate-100 text-slate-600"><MessageSquare className="h-3 w-3" /> {l._count.notes}</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1"><LeadStage id={l.id} status={l.status} /></div>
          <a href={whatsappLink(l.phone)} target="_blank" rel="noopener noreferrer" aria-label="Abrir WhatsApp" title="WhatsApp"
            className="icon-box h-8 w-8 bg-green-50 text-green-700 hover:bg-green-100"><MessageCircle className="h-4 w-4" /></a>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contatos"
        subtitle="Acompanhe cada interessado da primeira mensagem até a venda."
        actions={<Link href="/painel/contatos/novo" className="btn-primary"><Plus className="h-4 w-4" /> Novo contato</Link>}
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <form className="relative flex-1">
          {sp.filtro && <input type="hidden" name="filtro" value={sp.filtro} />}
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={sp.q} placeholder="Buscar por nome ou telefone" className="input py-3 pl-10" />
        </form>
        <div className="flex gap-2 overflow-x-auto">
          {([["", "Todos"], ["retornar", `Retornar hoje${followUps ? ` (${followUps})` : ""}`], ...(asAdmin ? [] : [["meus", "Meus"]])] as [string, string][]).map(([k, label]) => (
            <Link key={k} href={qs({ filtro: k || undefined })} className={`btn shrink-0 border ${(sp.filtro ?? "") === k ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600"}`}>{label}</Link>
          ))}
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="card"><EmptyState icon={MessageSquare} title="Nenhum contato" text="Os contatos do site aparecem aqui. Cadastre também quem chega pelo WhatsApp ou na loja." /></div>
      ) : (
        <>
          {/* Celular: uma etapa por vez */}
          <div className="space-y-4 lg:hidden">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {COLUMNS.map((c) => (
                <Link key={c.key} href={qs({ etapa: c.key })} className={`btn shrink-0 border ${stage === c.key ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600"}`}>
                  <span className={`h-2 w-2 rounded-full ${c.tone}`} /> {leadStatusLabels[c.key]} <span className="text-xs opacity-70">{leads.filter((l) => l.status === c.key).length}</span>
                </Link>
              ))}
            </div>
            <ul className="space-y-3">{leads.filter((l) => l.status === stage).map(card)}</ul>
          </div>
          {/* Computador: quadro */}
          <div className="hidden gap-4 lg:grid lg:grid-cols-5">
            {COLUMNS.map((c) => {
              const list = leads.filter((l) => l.status === c.key);
              return (
                <section key={c.key} className="min-w-0 space-y-3 rounded-2xl bg-slate-100/70 p-3">
                  <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-700">
                    <span className={`h-2.5 w-2.5 rounded-full ${c.tone}`} /> {leadStatusLabels[c.key]} <span className="ml-auto text-xs font-normal text-slate-500">{list.length}</span>
                  </h2>
                  <ul className="space-y-3">{list.map(card)}</ul>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
