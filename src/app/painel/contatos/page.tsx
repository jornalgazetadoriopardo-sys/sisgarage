import Link from "next/link";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { vehicleTitle, whatsappLink } from "@/lib/format";
import { markLeadRead } from "@/app/actions/store";

export default async function LeadsPage() {
  const { storeId } = await requireStoreUser();
  const leads = await prisma.lead.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { vehicle: { select: { id: true, brand: true, model: true, version: true, yearModel: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Contatos recebidos</h1>
      <p className="text-sm text-slate-500">Mensagens enviadas pelos compradores através do site.</p>
      {leads.length === 0 ? (
        <p className="card p-10 text-center text-slate-500">Nenhum contato ainda.</p>
      ) : (
        <ul className="space-y-2">
          {leads.map((l) => (
            <li key={l.id} className={`card p-4 ${l.read ? "" : "border-l-4 border-l-brand-500"}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {l.name} {!l.read && <span className="badge ml-1 bg-brand-100 text-brand-700">Novo</span>}
                  </p>
                  <p className="text-sm text-slate-600">{l.phone}{l.email ? ` · ${l.email}` : ""}</p>
                  {l.vehicle && (
                    <Link href={`/painel/veiculos/${l.vehicle.id}`} className="text-sm text-brand-600 hover:underline">
                      {vehicleTitle(l.vehicle)} {l.vehicle.yearModel}
                    </Link>
                  )}
                  {l.message && <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{l.message}</p>}
                  <p className="mt-2 text-xs text-slate-400">{l.createdAt.toLocaleString("pt-BR")}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a className="btn-whatsapp" target="_blank" rel="noopener noreferrer"
                    href={whatsappLink(l.phone, `Olá ${l.name.split(" ")[0]}, aqui é da loja. Recebemos seu contato pelo SisGarage.`)}>
                    WhatsApp
                  </a>
                  <form action={markLeadRead}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="read" value={String(!l.read)} />
                    <button className="btn-secondary">{l.read ? "Marcar não lido" : "Marcar lido"}</button>
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
