import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Plus, ReceiptText, Trash2, UserRound } from "lucide-react";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dayInput, formatDay, formatPrice, vehicleTitle, whatsappLink } from "@/lib/format";
import { saleStatusLabels } from "@/lib/labels";
import { deleteCustomer } from "@/app/actions/customers";
import { CustomerForm } from "@/components/CustomerForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageHeader, Section } from "@/components/ui";

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string }> }) {
  const { storeId } = await requireStoreUser();
  const { id } = await params;
  const { novo } = await searchParams;
  const c = await prisma.customer.findFirst({
    where: { id, storeId },
    include: { sales: { orderBy: { date: "desc" }, include: { vehicle: { select: { brand: true, model: true, version: true, yearModel: true } } } } },
  });
  if (!c) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: "/painel/clientes", label: "Clientes" }}
        title={c.name}
        subtitle={novo ? "Cliente criado a partir do contato. Complete CPF e endereço para gerar o contrato." : `Cliente desde ${formatDay(c.createdAt)}`}
        actions={
          <>
            {c.phone && <a href={whatsappLink(c.phone)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
            <Link href={`/painel/vendas/nova?cliente=${c.id}`} className="btn-primary"><Plus className="h-4 w-4" /> Nova venda</Link>
          </>
        }
      />
      <Section icon={ReceiptText} tone="green" title="Compras" description={c.sales.length ? undefined : "Nenhuma compra registrada."}>
        {c.sales.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {c.sales.map((s) => (
              <li key={s.id}>
                <Link href={`/painel/vendas/${s.id}`} className="flex flex-col gap-1 py-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-2">
                  <span className="font-medium text-slate-800">Nº {s.number} · {vehicleTitle(s.vehicle)} {s.vehicle.yearModel}</span>
                  <span className="flex items-center gap-3 text-sm text-slate-500">
                    {formatDay(s.date)} <strong className="text-slate-900">{formatPrice(s.price)}</strong>
                    <span className="badge bg-slate-100 text-slate-600">{saleStatusLabels[s.status]}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section icon={UserRound} tone="blue" title="Dados do cliente">
        <CustomerForm customer={{ ...c, birthDate: dayInput(c.birthDate) }} />
      </Section>
      {c.sales.length === 0 && (
        <Section icon={Trash2} tone="red" title="Excluir cliente" description="Só é possível excluir clientes sem vendas registradas.">
          <form action={deleteCustomer}>
            <input type="hidden" name="id" value={c.id} />
            <ConfirmButton message="Excluir este cliente?" className="btn-danger">Excluir cliente</ConfirmButton>
          </form>
        </Section>
      )}
    </div>
  );
}
