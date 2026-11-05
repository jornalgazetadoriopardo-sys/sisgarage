import Link from "next/link";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPhone, vehicleTitle, whatsappLink } from "@/lib/format";
import { markLeadRead } from "@/app/actions/store";
import { customerFromLead } from "@/app/actions/customers";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function LeadsPage() {
  const { storeId } = await requireStoreUser();
  const leads = await prisma.lead.findMany({
    where: { storeId },
    orderBy: [{ read: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: { vehicle: { select: { id: true, brand: true, model: true, version: true, yearModel: true } } },
  });
  const unread = leads.filter((l) => !l.read).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Contatos" subtitle={unread ? `${unread} contato(s) aguardando resposta` : "Mensagens enviadas pelos compradores pelo site."} />
      {leads.length === 0 ? (
        <div className="card">
          <EmptyState icon={MessageSquare} title="Nenhum contato ainda" text="Quando alguém enviar uma mensagem pela página de um veículo, ela aparece aqui." />
        </div>
      ) : (
        <ul className="space-y-4">
          {leads.map((l) => (
            <li key={l.id} className={`card p-5 sm:p-6 ${l.read ? "" : "border-l-4 border-l-brand-500"}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <p className="flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-900">
                    {l.name} {!l.read && <span className="badge bg-brand-100 text-brand-700">Novo</span>}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4 text-slate-400" /> {formatPhone(l.phone)}</span>
                    {l.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4 text-slate-400" /> {l.email}</span>}
                  </div>
                  {l.vehicle && (
                    <Link href={`/painel/veiculos/${l.vehicle.id}`} className="inline-block text-sm font-medium text-brand-600 hover:underline">
                      {vehicleTitle(l.vehicle)} {l.vehicle.yearModel}
                    </Link>
                  )}
                  {l.message && <p className="whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{l.message}</p>}
                  <p className="text-xs text-slate-400">{l.createdAt.toLocaleString("pt-BR")}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <a className="btn-whatsapp" target="_blank" rel="noopener noreferrer"
                    href={whatsappLink(l.phone, `Olá ${l.name.split(" ")[0]}, aqui é da loja. Recebemos seu contato pelo SisGarage.`)}>
                    Responder no WhatsApp
                  </a>
                  <form action={customerFromLead}>
                    <input type="hidden" name="id" value={l.id} />
                    <button className="btn-secondary">Cadastrar como cliente</button>
                  </form>
                  <form action={markLeadRead}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="read" value={String(!l.read)} />
                    <button className="btn-secondary">{l.read ? "Marcar como novo" : "Marcar como lido"}</button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
