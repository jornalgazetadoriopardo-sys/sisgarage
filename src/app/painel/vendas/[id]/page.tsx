/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Car, FileText, Pencil, Repeat, TrendingUp, UserRound, Wallet } from "lucide-react";
import { canSeeFinance, requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDocument } from "@/lib/br-docs";
import { vehicleFinance } from "@/lib/finance";
import { formatDay, formatMoney, formatPercent, formatPhone, vehicleTitle } from "@/lib/format";
import { paymentMethodLabels, saleStatusLabels } from "@/lib/labels";
import { availableDocuments, SALE_DOCUMENTS } from "@/lib/pdf/sale-documents";
import { SaleDocuments } from "@/components/SaleDocuments";
import { CancelSale, PaymentPaidToggle } from "@/components/SaleActions";
import { PageHeader, Section, StatCard } from "@/components/ui";

const chip = { RESERVED: "bg-amber-50 text-amber-700", COMPLETED: "bg-emerald-50 text-emerald-700", CANCELED: "bg-red-50 text-red-700" } as const;

export default async function SalePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  const ctx = await requireStoreUser();
  const { id } = await params;
  const { salvo } = await searchParams;
  const sale = await prisma.sale.findFirst({
    where: { id, storeId: ctx.storeId },
    include: {
      customer: true,
      payments: { orderBy: [{ dueDate: "asc" }, { id: "asc" }] },
      tradeInVehicle: { select: { id: true, brand: true, model: true, version: true, yearModel: true } },
      vehicle: {
        include: {
          photos: { orderBy: { position: "asc" }, take: 1, select: { thumbUrl: true } },
          expenses: { select: { amount: true } },
          taxes: { select: { amount: true, paidAt: true } },
        },
      },
    },
  });
  if (!sale) notFound();
  const finance = canSeeFinance(ctx);
  const v = sale.vehicle;
  const paid = sale.payments.filter((p) => p.paidAt).reduce((s, p) => s + Number(p.amount), 0);
  const open = Number(sale.price) - paid;
  const f = vehicleFinance({ ...v, price: sale.price });
  const realProfit = f.profit - Number(sale.commission ?? 0);
  const docs = availableDocuments(sale.status, sale.warrantyDays).map((k) => ({ kind: k, label: SALE_DOCUMENTS[k] }));
  const missing = [
    !sale.customer.document && "CPF/CNPJ do cliente",
    !sale.customer.address && "endereço do cliente",
    !v.plate && "placa",
    !v.renavam && "Renavam",
    !v.chassis && "chassi",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: "/painel/vendas", label: "Vendas" }}
        title={`Venda nº ${sale.number}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`badge ${chip[sale.status]}`}>{saleStatusLabels[sale.status]}</span>
            <span>{formatDay(sale.date)}</span>
            <span>Vendedor: {sale.sellerName}</span>
          </span>
        }
        actions={sale.status !== "CANCELED" && (
          <Link href={`/painel/vendas/${sale.id}/editar`} className={sale.status === "RESERVED" ? "btn-primary" : "btn-secondary"}>
            <Pencil className="h-4 w-4" /> {sale.status === "RESERVED" ? "Concluir venda" : "Editar"}
          </Link>
        )}
      />
      {salvo && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Venda salva. Os documentos já podem ser gerados abaixo.</p>}
      {sale.status === "CANCELED" && (
        <div className="space-y-1 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>Cancelada em {sale.canceledAt?.toLocaleDateString("pt-BR")}: {sale.cancelReason}. O veículo voltou para o estoque.</p>
          {sale.tradeInVehicle && <p>O veículo recebido na troca continua no estoque; ajuste ou exclua se o negócio foi desfeito.</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Valor da venda" value={formatMoney(Number(sale.price))} hint={open > 0.005 ? `${formatMoney(open)} a receber` : "Tudo recebido"} />
        {finance && (
          <>
            <StatCard icon={FileText} tone="violet" label="Custo do veículo" value={formatMoney(f.cost)} hint={sale.commission ? `+ comissão ${formatMoney(Number(sale.commission))}` : undefined} />
            <StatCard icon={TrendingUp} tone={realProfit >= 0 ? "green" : "red"} label="Lucro da venda" value={f.cost > 0 ? formatMoney(realProfit) : "—"}
              hint={f.cost > 0 ? `${formatPercent((realProfit / f.cost) * 100)} sobre o custo` : "Lance a compra na Gestão do veículo"} />
          </>
        )}
      </div>

      {sale.status !== "CANCELED" && (
        <Section icon={FileText} tone="red" title="Documentos" description="Toque para abrir. Use o botão de compartilhar para mandar pelo WhatsApp.">
          {missing.length > 0 && (
            <p className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Faltam dados para documentos completos: {missing.join(", ")}.
            </p>
          )}
          <SaleDocuments saleId={sale.id} docs={docs} fileBase={`venda-${sale.number}`} />
          <p className="mt-4 text-xs text-slate-400">Os textos são modelos. Recomendamos que um advogado revise o contrato e o termo de garantia da sua loja.</p>
        </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section icon={Car} tone="blue" title="Veículo">
          <Link href={`/painel/veiculos/${v.id}`} className="flex items-center gap-4 rounded-xl p-1 hover:bg-slate-50">
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">{v.photos[0] && <img src={v.photos[0].thumbUrl} alt="" className="h-full w-full object-cover" />}</div>
            <div className="min-w-0 text-sm">
              <p className="font-medium text-slate-900">{vehicleTitle(v)} {v.yearModel}</p>
              <p className="text-slate-500">{[v.plate, v.color, `${(sale.mileageAtSale ?? v.mileage).toLocaleString("pt-BR")} km`].filter(Boolean).join(" · ")}</p>
            </div>
          </Link>
          {sale.tradeInVehicle && (
            <Link href={`/painel/veiculos/${sale.tradeInVehicle.id}`} className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100">
              <Repeat className="h-4 w-4 text-slate-400" /> Troca: {vehicleTitle(sale.tradeInVehicle)} {sale.tradeInVehicle.yearModel}
            </Link>
          )}
        </Section>
        <Section icon={UserRound} tone="green" title="Cliente">
          <Link href={`/painel/clientes/${sale.customer.id}`} className="block space-y-1 rounded-xl p-1 text-sm hover:bg-slate-50">
            <p className="font-medium text-slate-900">{sale.customer.name}</p>
            <p className="text-slate-500">{[sale.customer.document ? formatDocument(sale.customer.document) : null, sale.customer.phone ? formatPhone(sale.customer.phone) : null].filter(Boolean).join(" · ") || "Cadastro incompleto"}</p>
            {sale.customer.city && <p className="text-slate-500">{sale.customer.city}/{sale.customer.state}</p>}
          </Link>
        </Section>
      </div>

      <Section icon={Wallet} tone="violet" title="Pagamentos" description={`${formatMoney(paid)} recebido de ${formatMoney(Number(sale.price))}.`}>
        <ul className="divide-y divide-slate-100">
          {sale.payments.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-slate-800">{paymentMethodLabels[p.method]}{p.details ? ` · ${p.details}` : ""}</p>
                <p className="mt-1 text-xs">
                  {p.paidAt ? <span className="badge bg-emerald-50 text-emerald-700">Recebido em {formatDay(p.paidAt)}</span>
                    : <span className="badge bg-amber-50 text-amber-700">A receber{p.dueDate ? ` · ${formatDay(p.dueDate)}` : ""}</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-900">{formatMoney(Number(p.amount))}</span>
                {sale.status !== "CANCELED" && <PaymentPaidToggle id={p.id} paid={Boolean(p.paidAt)} />}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {sale.notes && <Section icon={FileText} tone="slate" title="Condições adicionais"><p className="whitespace-pre-line text-sm text-slate-700">{sale.notes}</p></Section>}

      {sale.status !== "CANCELED" && (
        <Section icon={AlertTriangle} tone="red" title="Cancelamento" description="O veículo volta para o estoque como “À venda”.">
          <CancelSale saleId={sale.id} />
        </Section>
      )}
    </div>
  );
}
