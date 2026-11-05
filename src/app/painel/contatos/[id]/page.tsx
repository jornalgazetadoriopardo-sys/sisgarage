import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, Car, Clock, History, Mail, MessageCircle, Phone, Target, UserPlus } from "lucide-react";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { agendaOptions } from "@/lib/agenda";
import { dayInput, formatPhone, onlyDigits, vehicleTitle, whatsappLink } from "@/lib/format";
import { appointmentStatusLabels, appointmentTypeLabels, leadSourceLabels, leadStatusLabels } from "@/lib/labels";
import { localDay, localTime } from "@/lib/time";
import { customerFromLead } from "@/app/actions/customers";
import { LeadStatusForm, NoteForm } from "@/components/crm/LeadForms";
import { PageHeader, Section } from "@/components/ui";

export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ perdido?: string }> }) {
  const { storeId } = await requireStoreUser();
  const { id } = await params;
  const { perdido } = await searchParams;
  const lead = await prisma.lead.findFirst({
    where: { id, storeId },
    include: {
      vehicle: { select: { id: true, brand: true, model: true, version: true, yearModel: true } },
      notes: { orderBy: { createdAt: "desc" } },
      appointments: { orderBy: { startsAt: "desc" } },
    },
  });
  if (!lead) notFound();
  if (!lead.read) await prisma.lead.update({ where: { id }, data: { read: true } });
  const [{ users }, customer] = await Promise.all([
    agendaOptions(storeId),
    prisma.customer.findFirst({ where: { storeId, phone: onlyDigits(lead.phone) }, select: { id: true } }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: "/painel/contatos", label: "Contatos" }}
        title={lead.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="badge bg-brand-50 text-brand-700">{leadStatusLabels[lead.status]}</span>
            <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4" /> {formatPhone(lead.phone)}</span>
            {lead.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" /> {lead.email}</span>}
            <span>Origem: {leadSourceLabels[lead.source]}</span>
          </span>
        }
        actions={
          <>
            <a href={whatsappLink(lead.phone, `Olá ${lead.name.split(" ")[0]}, tudo bem?`)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
            <Link href={`/painel/agenda?lead=${lead.id}`} className="btn-secondary"><CalendarPlus className="h-4 w-4" /> Agendar</Link>
            {customer ? (
              <Link href={`/painel/vendas/nova?cliente=${customer.id}${lead.vehicle ? `&veiculo=${lead.vehicle.id}` : ""}`} className="btn-primary">Registrar venda</Link>
            ) : (
              <form action={customerFromLead}>
                <input type="hidden" name="id" value={lead.id} />
                <button className="btn-secondary"><UserPlus className="h-4 w-4" /> Virar cliente</button>
              </form>
            )}
          </>
        }
      />

      {(lead.vehicle || lead.message) && (
        <Section icon={Car} tone="blue" title="Interesse">
          {lead.vehicle && <Link href={`/painel/veiculos/${lead.vehicle.id}`} className="font-medium text-brand-600 hover:underline">{vehicleTitle(lead.vehicle)} {lead.vehicle.yearModel}</Link>}
          {lead.message && <p className="mt-2 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{lead.message}</p>}
          <p className="mt-2 text-xs text-slate-400">Recebido em {lead.createdAt.toLocaleString("pt-BR")}</p>
        </Section>
      )}

      <Section icon={Target} tone="amber" title="Acompanhamento" description="Etapa do funil, data do próximo retorno e responsável.">
        <LeadStatusForm id={lead.id} status={lead.status} nextFollowUp={dayInput(lead.nextFollowUp)} assignedToId={lead.assignedToId ?? ""}
          lostReason={lead.lostReason ?? ""} users={users} focusLost={Boolean(perdido)} />
      </Section>

      <Section icon={History} tone="violet" title="Histórico">
        <NoteForm id={lead.id} />
        {lead.notes.length > 0 && (
          <ol className="mt-6 space-y-4 border-l-2 border-slate-100 pl-5">
            {lead.notes.map((n) => (
              <li key={n.id} className="relative">
                <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-violet-400" />
                <p className="whitespace-pre-line text-sm text-slate-800">{n.text}</p>
                <p className="mt-1 text-xs text-slate-400">{n.userName} · {n.createdAt.toLocaleString("pt-BR")}</p>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {lead.appointments.length > 0 && (
        <Section icon={Clock} tone="green" title="Agendamentos">
          <ul className="divide-y divide-slate-100">
            {lead.appointments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>{appointmentTypeLabels[a.type]} · {localDay(a.startsAt).split("-").reverse().join("/")} às {localTime(a.startsAt)}</span>
                <span className="badge bg-slate-100 text-slate-600">{appointmentStatusLabels[a.status]}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
