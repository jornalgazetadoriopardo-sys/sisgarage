import Link from "next/link";
import {
  BadgeDollarSign, CalendarClock, Download, Eye, FileCheck2, Gauge, History, Hourglass, Landmark, ReceiptText, Share2, TrendingDown, TrendingUp, Wallet,
} from "lucide-react";
import { canSeeFinance, type StoreContext } from "@/lib/auth";
import { formatDay, formatMoney, formatPercent } from "@/lib/format";
import { saleStatusLabels } from "@/lib/labels";
import { auditLabel } from "@/lib/audit-labels";
import type { VehicleReport } from "@/lib/vehicle-report";
import { Section, StatCard, type Tone } from "../ui";

const bucketTone: Record<string, Tone> = { "0-30": "green", "31-60": "blue", "61-90": "amber", "90+": "red" };

function MiniBars({ points, color }: { points: { label: string; value: number }[]; color: string }) {
  if (points.length < 2) return null;
  const max = Math.max(...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  return (
    <div className="mb-4 flex h-20 items-end gap-1.5">
      {points.map((p, i) => (
        <span key={i} title={`${p.label}: ${formatMoney(p.value)}`} className={`flex-1 rounded-t ${color}`}
          style={{ height: `${max === min ? 60 : 20 + ((p.value - min) / (max - min)) * 80}%` }} />
      ))}
    </div>
  );
}

export function FichaTab({ ctx, report }: { ctx: StoreContext; report: VehicleReport }) {
  const { v, sale, metrics: m, finance: f, timeline, appointmentsDone } = report;
  const owner = canSeeFinance(ctx);
  const docsOk = v.documents.filter((d) => d.status !== "PENDING").length;
  const pendingDocs = v.documents.filter((d) => d.status === "PENDING");
  const openTaxes = v.taxes.filter((t) => !t.paidAt);
  const sold = sale?.status === "COMPLETED";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <a href={`/painel/veiculos/${v.id}/ficha.pdf`} target="_blank" rel="noopener" className="btn-primary"><Download className="h-4 w-4" /> Baixar ficha em PDF</a>
        <Link href={`/painel/social?veiculo=${v.id}`} className="btn-secondary"><Share2 className="h-4 w-4" /> Criar post</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={Hourglass} tone={bucketTone[m.bucket]} label={sold ? "Dias até vender" : "Dias na loja"} value={m.days}
          hint={`Entrada em ${formatDay(m.entry)}`} />
        <StatCard icon={m.priceChange < 0 ? TrendingDown : TrendingUp} tone="blue" label="Preço atual" value={formatMoney(m.price)}
          hint={m.priceChanges ? `${formatPercent(m.priceChange)} desde o cadastro · ${m.priceChanges} alteração(ões)` : "Sem alterações"} />
        <StatCard icon={Gauge} tone="amber" label="FIPE" value={m.fipeLast ? formatMoney(m.fipeLast) : "—"}
          hint={m.fipeChange !== null ? `${formatPercent(m.fipeChange)} em ${m.fipeMonths} meses` : m.fipeLast ? "Primeiro mês registrado" : "Vincule na aba Gestão"} />
        <StatCard icon={Eye} tone="violet" label="Interesse" value={`${v.views} visitas`}
          hint={`${v._count.leads} contato(s) · ${v._count.appointments} agendamento(s), ${appointmentsDone} realizado(s)`} />
      </div>

      {owner && (
        <Section icon={Wallet} tone="violet" title={sold ? "Resultado da venda" : "Resultado previsto"}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4">
            {([
              ["Compra", f.purchase],
              ["Gastos de preparação", f.expenses],
              ["IPVA, multas e débitos", f.taxes],
              ["Custo total", f.cost],
              [sold ? "Vendido por" : "Preço de venda", f.price],
              ...(sold && sale?.commission ? [["Comissão", Number(sale.commission)] as [string, number]] : []),
              [sold ? "Lucro real" : "Lucro previsto", f.profit - (sold && sale?.commission ? Number(sale.commission) : 0)],
            ] as [string, number][]).map(([k, val]) => (
              <div key={k}>
                <dt className="text-slate-500">{k}</dt>
                <dd className={`text-lg font-semibold ${k.startsWith("Lucro") ? (val >= 0 ? "text-emerald-700" : "text-red-600") : "text-slate-900"}`}>{f.cost > 0 || !k.startsWith("Lucro") ? formatMoney(val) : "—"}</dd>
              </div>
            ))}
            {m.vsFipe !== null && (
              <div>
                <dt className="text-slate-500">Preço × FIPE</dt>
                <dd className="text-lg font-semibold text-slate-900">{formatPercent(m.vsFipe)}</dd>
              </div>
            )}
          </dl>
        </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section icon={BadgeDollarSign} tone="blue" title="Histórico de preço">
          <MiniBars color="bg-brand-200" points={v.priceHistory.map((p) => ({ label: formatDay(p.changedAt), value: Number(p.price) }))} />
          <ul className="divide-y divide-slate-100 text-sm">
            {[...v.priceHistory].reverse().map((p) => (
              <li key={p.id} className="flex justify-between gap-3 py-2.5">
                <span className="text-slate-500">{p.changedAt.toLocaleDateString("pt-BR")} · {p.userName}</span>
                <span className="font-semibold text-slate-900">{formatMoney(Number(p.price))}</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section icon={Gauge} tone="amber" title="Oscilação da FIPE">
          {v.fipeHistory.length === 0 ? (
            <p className="text-sm text-slate-500">Vincule o veículo à tabela FIPE na aba Gestão. Depois ela é atualizada todo mês.</p>
          ) : (
            <>
              <MiniBars color="bg-amber-200" points={v.fipeHistory.map((h) => ({ label: h.reference, value: Number(h.value) }))} />
              <ul className="divide-y divide-slate-100 text-sm">
                {[...v.fipeHistory].reverse().map((h, i, arr) => {
                  const prev = arr[i + 1];
                  const diff = prev ? ((Number(h.value) - Number(prev.value)) / Number(prev.value)) * 100 : null;
                  return (
                    <li key={h.id} className="flex justify-between gap-3 py-2.5">
                      <span className="capitalize text-slate-500">{h.reference}</span>
                      <span className="flex items-center gap-2">
                        {diff !== null && <span className={`text-xs ${diff < 0 ? "text-red-600" : "text-emerald-700"}`}>{formatPercent(diff)}</span>}
                        <span className="font-semibold text-slate-900">{formatMoney(Number(h.value))}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section icon={FileCheck2} tone="green" title="Documentação" description={`${docsOk} de ${v.documents.length} itens conferidos.`}>
          {pendingDocs.length ? (
            <p className="text-sm text-amber-700">Pendente: {pendingDocs.map((d) => d.label ?? d.type).join(", ")}.</p>
          ) : (
            <p className="text-sm text-emerald-700">Tudo em ordem.</p>
          )}
          <Link href={`/painel/veiculos/${v.id}?aba=gestao`} className="mt-3 inline-block text-sm font-medium text-brand-600">Abrir documentação</Link>
        </Section>
        <Section icon={Landmark} tone="red" title="Débitos" description={openTaxes.length ? `${openTaxes.length} em aberto.` : "Nenhum débito em aberto."}>
          {owner && openTaxes.length > 0 && <p className="text-sm text-slate-700">Total em aberto: <strong>{formatMoney(f.taxesOpen)}</strong></p>}
        </Section>
      </div>

      {sale && (
        <Section icon={ReceiptText} tone="green" title={`Venda nº ${sale.number}`} description={`${saleStatusLabels[sale.status]} em ${formatDay(sale.date)} para ${sale.customer.name}.`}>
          <Link href={`/painel/vendas/${sale.id}`} className="btn-secondary">Abrir venda</Link>
        </Section>
      )}

      <Section icon={History} tone="slate" title="Linha do tempo" description="Últimas alterações feitas neste veículo.">
        {timeline.length === 0 ? (
          <p className="text-sm text-slate-500">Sem registros ainda.</p>
        ) : (
          <ol className="space-y-4 border-l-2 border-slate-100 pl-5">
            {timeline.map((t) => (
              <li key={t.id} className="relative">
                <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-300" />
                <p className="text-sm font-medium text-slate-800">{auditLabel(t.action)}{owner && t.details ? <span className="font-normal text-slate-500"> · {t.details}</span> : null}</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-400"><CalendarClock className="h-3 w-3" /> {t.createdAt.toLocaleString("pt-BR")} · {t.userName}{t.asAdmin ? " (admin)" : ""}</p>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
