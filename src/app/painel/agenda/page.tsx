import Link from "next/link";
import { CalendarDays, CalendarPlus, Car, ChevronLeft, ChevronRight, Clock, MessageCircle, Pencil, Phone, UserRound } from "lucide-react";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { agendaOptions, googleCalendarLink } from "@/lib/agenda";
import { formatPhone, vehicleTitle, whatsappLink } from "@/lib/format";
import { appointmentStatusLabels, appointmentTypeLabels } from "@/lib/labels";
import { addDays, dayLabel, localDay, localTime, startOfLocalDay, todayLocal, weekdayLabel } from "@/lib/time";
import { AppointmentForm } from "@/components/agenda/AppointmentForm";
import { AppointmentActions } from "@/components/agenda/AppointmentActions";
import { EmptyState, PageHeader, Section } from "@/components/ui";

const statusChip = {
  REQUESTED: "bg-violet-50 text-violet-700",
  SCHEDULED: "bg-brand-50 text-brand-700",
  DONE: "bg-emerald-50 text-emerald-700",
  NO_SHOW: "bg-slate-100 text-slate-600",
  CANCELED: "bg-red-50 text-red-700",
} as const;

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ inicio?: string; editar?: string; novo?: string; lead?: string; veiculo?: string; cliente?: string }> }) {
  const { storeId, store, user } = await requireStoreUser();
  const sp = await searchParams;
  const today = todayLocal();
  const from = sp.inicio && /^\d{4}-\d{2}-\d{2}$/.test(sp.inicio) ? sp.inicio : today;
  const to = addDays(from, 7);

  const [items, requests, options, editing, lead] = await Promise.all([
    prisma.appointment.findMany({
      where: { storeId, startsAt: { gte: startOfLocalDay(from), lt: startOfLocalDay(to) }, status: { not: "REQUESTED" } },
      orderBy: { startsAt: "asc" },
      include: { vehicle: { select: { id: true, brand: true, model: true, version: true, yearModel: true } } },
    }),
    prisma.appointment.findMany({
      where: { storeId, status: "REQUESTED" },
      orderBy: { startsAt: "asc" },
      include: { vehicle: { select: { id: true, brand: true, model: true, version: true, yearModel: true } } },
    }),
    agendaOptions(storeId),
    sp.editar ? prisma.appointment.findFirst({ where: { id: sp.editar, storeId } }) : null,
    sp.lead ? prisma.lead.findFirst({ where: { id: sp.lead, storeId }, select: { id: true, name: true, phone: true, vehicleId: true } }) : null,
  ]);
  const users = new Map(options.users.map((u) => [u.id, u.label]));
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));

  type Item = (typeof items)[number];
  const card = (a: Item) => {
    const who = a.contactName ?? "Sem contato";
    const what = a.title ?? `${appointmentTypeLabels[a.type]}${a.vehicle ? ` · ${vehicleTitle(a.vehicle)}` : ""}`;
    const when = `${weekdayLabel(localDay(a.startsAt))}, ${dayLabel(localDay(a.startsAt))} às ${localTime(a.startsAt)}`;
    const msg = `Olá ${who.split(" ")[0]}! Aqui é da ${store.name}. Confirmando ${appointmentTypeLabels[a.type].toLowerCase()} ${when}${a.vehicle ? ` (${vehicleTitle(a.vehicle)})` : ""}. Endereço: ${[store.address, store.city].filter(Boolean).join(", ")}. Podemos confirmar?`;
    return (
      <li key={a.id} className={`card p-4 sm:p-5 ${a.status === "CANCELED" || a.status === "NO_SHOW" ? "opacity-60" : ""}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-brand-50 py-2 text-brand-700">
              <Clock className="h-4 w-4" />
              <span className="mt-1 text-sm font-bold">{localTime(a.startsAt)}</span>
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="font-semibold text-slate-900">{what}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5"><UserRound className="h-4 w-4" /> {who}</span>
                {a.contactPhone && <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4" /> {formatPhone(a.contactPhone)}</span>}
                {a.vehicle && <Link href={`/painel/veiculos/${a.vehicle.id}`} className="inline-flex items-center gap-1.5 hover:text-brand-600"><Car className="h-4 w-4" /> {a.vehicle.model}</Link>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className={`badge ${statusChip[a.status]}`}>{appointmentStatusLabels[a.status]}</span>
                <span className="badge bg-slate-100 text-slate-600">{appointmentTypeLabels[a.type]}</span>
                {a.assignedToId && users.get(a.assignedToId) && <span className="badge bg-slate-100 text-slate-600">{users.get(a.assignedToId)}</span>}
              </div>
              {a.notes && <p className="text-sm text-slate-600">{a.notes}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <AppointmentActions id={a.id} status={a.status} />
            <div className="flex flex-wrap gap-1">
              {a.contactPhone && (a.status === "SCHEDULED" || a.status === "REQUESTED") && (
                <a href={whatsappLink(a.contactPhone, msg)} target="_blank" rel="noopener noreferrer" className="btn-ghost px-2.5 py-1.5 text-xs text-green-700"><MessageCircle className="h-3.5 w-3.5" /> Confirmar no WhatsApp</a>
              )}
              {a.status === "SCHEDULED" && (
                <a href={googleCalendarLink({ title: `${what} – ${who}`, startsAt: a.startsAt, durationMin: a.durationMin, details: a.notes ?? "", location: store.address ?? store.city })}
                  target="_blank" rel="noopener noreferrer" className="btn-ghost px-2.5 py-1.5 text-xs"><CalendarPlus className="h-3.5 w-3.5" /> Google Agenda</a>
              )}
              <Link href={`/painel/agenda?inicio=${from}&editar=${a.id}`} className="btn-ghost px-2.5 py-1.5 text-xs"><Pencil className="h-3.5 w-3.5" /> Editar</Link>
            </div>
          </div>
        </div>
      </li>
    );
  };

  const formValues = editing
    ? {
        id: editing.id, type: editing.type, day: localDay(editing.startsAt), time: localTime(editing.startsAt), durationMin: editing.durationMin,
        title: editing.title, vehicleId: editing.vehicleId, customerId: editing.customerId, leadId: editing.leadId,
        contactName: editing.contactName, contactPhone: editing.contactPhone, assignedToId: editing.assignedToId, notes: editing.notes,
      }
    : lead
      ? { leadId: lead.id, contactName: lead.name, contactPhone: lead.phone, vehicleId: lead.vehicleId, assignedToId: user.storeId ? user.id : null }
      : { vehicleId: sp.veiculo ?? null, customerId: sp.cliente ?? null, assignedToId: user.storeId ? user.id : null };

  return (
    <div className="space-y-8">
      <PageHeader title="Agenda" subtitle="Test drives, visitas, vistorias, despachante e entregas." />

      <AppointmentForm
        key={editing?.id ?? lead?.id ?? "novo"}
        values={formValues}
        vehicles={options.vehicles}
        customers={options.customers}
        users={options.users}
        defaultDay={from}
        startOpen={Boolean(editing || lead || sp.novo || sp.veiculo || sp.cliente)}
        doneHref={editing || lead ? `/painel/agenda?inicio=${from}` : undefined}
      />

      {requests.length > 0 && (
        <Section icon={CalendarPlus} tone="violet" title={`${requests.length} pedido(s) de agendamento pelo site`} description="Confirme o horário com o cliente e toque em Confirmar.">
          <ul className="space-y-4">{requests.map(card)}</ul>
        </Section>
      )}

      <div className="flex items-center gap-2">
        <Link href={`/painel/agenda?inicio=${addDays(from, -7)}`} className="btn-ghost px-3" aria-label="Semana anterior"><ChevronLeft className="h-5 w-5" /></Link>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {days.map((d) => {
            const count = items.filter((a) => localDay(a.startsAt) === d && a.status === "SCHEDULED").length;
            return (
              <a key={d} href={`#dia-${d}`} className={`flex flex-col items-center rounded-xl py-2 text-xs ${d === today ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
                <span className="capitalize">{weekdayLabel(d, "short").replace(".", "")}</span>
                <span className="text-base font-bold">{d.slice(8)}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${count ? (d === today ? "bg-white" : "bg-brand-500") : "bg-transparent"}`} />
              </a>
            );
          })}
        </div>
        <Link href={`/painel/agenda?inicio=${addDays(from, 7)}`} className="btn-ghost px-3" aria-label="Próxima semana"><ChevronRight className="h-5 w-5" /></Link>
      </div>
      {from !== today && <Link href="/painel/agenda" className="text-sm font-medium text-brand-600">Voltar para hoje</Link>}

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={CalendarDays} title="Nenhum compromisso nesta semana" text="Use “Novo agendamento” para marcar test drives, visitas e entregas." /></div>
      ) : (
        <div className="space-y-8">
          {days.map((d) => {
            const list = items.filter((a) => localDay(a.startsAt) === d);
            if (!list.length) return null;
            return (
              <section key={d} id={`dia-${d}`} className="scroll-mt-24 space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {d === today ? "Hoje" : d === addDays(today, 1) ? "Amanhã" : weekdayLabel(d)} · {dayLabel(d)}
                </h2>
                <ul className="space-y-4">{list.map(card)}</ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
