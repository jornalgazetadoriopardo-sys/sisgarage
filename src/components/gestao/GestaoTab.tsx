import { BadgeDollarSign, ClipboardCheck, FileText, Gauge, Landmark, Receipt, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { canSeeFinance, type StoreContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { vehicleFinance } from "@/lib/finance";
import { dayInput, formatDay, formatMoney, formatPercent } from "@/lib/format";
import { expenseCategoryLabels, taxKindLabels } from "@/lib/labels";
import { fipeKindOf } from "@/lib/fipe";
import { ensureDefaultDocuments } from "@/lib/vehicle-management";
import { Section, StatCard } from "../ui";
import { PurchaseForm } from "./PurchaseForm";
import { DeleteExpense, ExpenseForm } from "./ExpenseForm";
import { TaxActions, TaxForm } from "./TaxForm";
import { DocumentRow, NewDocumentForm } from "./DocumentRow";
import { FipeCard } from "./FipeCard";
import { FileLink } from "./shared";

export async function GestaoTab({ ctx, vehicleId }: { ctx: StoreContext; vehicleId: string }) {
  await ensureDefaultDocuments(vehicleId);
  const v = await prisma.vehicle.findFirstOrThrow({
    where: { id: vehicleId, storeId: ctx.storeId },
    include: {
      expenses: { orderBy: { date: "desc" } },
      taxes: { orderBy: [{ paidAt: "asc" }, { dueDate: "asc" }] },
      documents: { orderBy: { type: "asc" } },
      fipeHistory: { orderBy: { month: "asc" }, take: 12 },
    },
  });
  const finance = canSeeFinance(ctx);
  const f = vehicleFinance(v);
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const docsOk = v.documents.filter((d) => d.status !== "PENDING").length;

  return (
    <div className="space-y-8">
      {/* Resumo: o mais importante primeiro */}
      {finance ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard icon={Wallet} tone="violet" label="Custo total" value={formatMoney(f.cost)}
            hint={`Compra ${formatMoney(f.purchase)} · Gastos ${formatMoney(f.expenses)} · Débitos ${formatMoney(f.taxes)}`} />
          <StatCard icon={BadgeDollarSign} label="Preço de venda" value={formatMoney(f.price)} />
          <StatCard icon={TrendingUp} tone={f.profit >= 0 ? "green" : "red"} label="Lucro previsto"
            value={f.cost > 0 ? formatMoney(f.profit) : "—"} hint={f.margin !== null ? `${formatPercent(f.margin)} sobre o custo` : "Lance o valor de compra"} />
          <StatCard icon={Gauge} tone="amber" label="Tabela FIPE" value={f.fipe ? formatMoney(f.fipe) : "—"}
            hint={f.priceVsFipe !== null ? `Preço ${formatPercent(f.priceVsFipe)} em relação à FIPE` : "Vincule abaixo"} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatCard icon={ClipboardCheck} tone="green" label="Documentação" value={`${docsOk} de ${v.documents.length}`} hint="itens conferidos" />
          <StatCard icon={Gauge} tone="amber" label="Tabela FIPE" value={f.fipe ? formatMoney(f.fipe) : "—"} />
        </div>
      )}

      <Section icon={Gauge} tone="amber" title="Tabela FIPE" description="Consulta gratuita e atualizada todo mês. Escolha o modelo exato uma vez.">
        <FipeCard
          vehicleId={v.id}
          linked={v.fipeValue && v.fipeCode ? {
            name: v.fipeName ?? "", code: v.fipeCode, value: Number(v.fipeValue), reference: v.fipeReference ?? "",
            checkedAt: v.fipeCheckedAt ? v.fipeCheckedAt.toLocaleDateString("pt-BR") : "—",
          } : null}
          history={v.fipeHistory.map((h) => ({ month: h.month, value: Number(h.value) }))}
          defaultKind={v.fipeType ?? fipeKindOf(v.type)}
          brandHint={v.brand}
          modelHint={v.model}
          yearHint={v.yearModel}
        />
      </Section>

      <Section icon={FileText} tone="blue" title="Documentação" description={`${docsOk} de ${v.documents.length} itens conferidos. Toque em um item para atualizar ou anexar o arquivo.`}>
        <ul className="space-y-3">
          {v.documents.map((d) => (
            <DocumentRow
              key={d.id}
              vehicleId={v.id}
              doc={{
                id: d.id, type: d.type, label: d.label, status: d.status, notes: d.notes, fileName: d.fileName, hasFile: Boolean(d.fileRef),
                expiresAt: dayInput(d.expiresAt), expiresLabel: d.expiresAt ? formatDay(d.expiresAt) : null, expired: Boolean(d.expiresAt && d.expiresAt < today),
              }}
            />
          ))}
        </ul>
        <div className="mt-5"><NewDocumentForm vehicleId={v.id} /></div>
      </Section>

      <Section icon={Landmark} tone="red" title="IPVA, licenciamento e multas"
        description={finance ? (f.taxesOpen > 0 ? `${formatMoney(f.taxesOpen)} em aberto.` : "Nenhum valor em aberto.") : "Situação dos débitos do veículo."}>
        {v.taxes.length === 0 ? (
          <p className="mb-5 rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">Nenhum débito lançado.</p>
        ) : (
          <ul className="mb-5 divide-y divide-slate-100">
            {v.taxes.map((t) => {
              const overdue = !t.paidAt && t.dueDate && t.dueDate < today;
              return (
                <li key={t.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">
                      {taxKindLabels[t.kind]}{t.description ? ` · ${t.description}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      {t.paidAt ? (
                        <span className="badge bg-emerald-50 text-emerald-700">Pago em {formatDay(t.paidAt)}</span>
                      ) : (
                        <span className={`badge ${overdue ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                          {overdue ? "Vencido" : "Em aberto"}{t.dueDate ? ` · vence ${formatDay(t.dueDate)}` : ""}
                        </span>
                      )}
                      {finance && t.fileRef && <FileLink href={`/painel/arquivo/debito/${t.id}`} name={t.fileName} />}
                    </div>
                  </div>
                  {finance && (
                    <div className="flex items-center gap-3 sm:justify-end">
                      <span className="font-semibold text-slate-900">{formatMoney(Number(t.amount))}</span>
                      <TaxActions id={t.id} paid={Boolean(t.paidAt)} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {finance && <TaxForm vehicleId={v.id} />}
      </Section>

      {finance && (
        <>
          <Section icon={ShoppingCart} tone="violet" title="Compra" description="Quanto a loja pagou e de quem comprou. Só o dono vê esta parte.">
            <PurchaseForm
              vehicleId={v.id}
              values={{
                purchaseDate: dayInput(v.purchaseDate),
                purchasePrice: v.purchasePrice ? Number(v.purchasePrice).toLocaleString("pt-BR") : "",
                purchaseSource: v.purchaseSource ?? "",
                purchaseFrom: v.purchaseFrom ?? "",
                purchasePayment: v.purchasePayment ?? "",
                purchaseNotes: v.purchaseNotes ?? "",
              }}
            />
          </Section>

          <Section icon={Receipt} tone="green" title="Gastos" description={`Total: ${formatMoney(f.expenses)} em ${v.expenses.length} lançamento(s).`}>
            {v.expenses.length > 0 && (
              <ul className="mb-5 divide-y divide-slate-100">
                {v.expenses.map((e) => (
                  <li key={e.id} className="flex flex-col gap-2 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">{e.description}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="badge bg-slate-100 text-slate-600">{expenseCategoryLabels[e.category]}</span>
                        <span>{formatDay(e.date)}</span>
                        {e.supplier && <span>· {e.supplier}</span>}
                        {e.fileRef && <FileLink href={`/painel/arquivo/gasto/${e.id}`} name={e.fileName} />}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      <span className="font-semibold text-slate-900">{formatMoney(Number(e.amount))}</span>
                      <DeleteExpense id={e.id} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <ExpenseForm vehicleId={v.id} today={today.toISOString().slice(0, 10)} />
          </Section>
        </>
      )}
    </div>
  );
}
