import Link from "next/link";
import { ArrowDownUp, Boxes, Download, Gauge, Hourglass, ImageOff, Timer, TrendingUp, Wallet } from "lucide-react";
import { canSeeFinance, requireStoreUser } from "@/lib/auth";
import { averageDaysToSell, loadStock, type AgingBucket } from "@/lib/vehicle-report";
import { formatMoney, formatPercent, vehicleTitle } from "@/lib/format";
import { vehicleStatusLabels } from "@/lib/labels";
import { EmptyState, PageHeader, Section, StatCard } from "@/components/ui";
import { VehiclePhoto } from "@/components/VehiclePhoto";

const BUCKETS: { key: AgingBucket; label: string; color: string; chip: string }[] = [
  { key: "0-30", label: "Até 30 dias", color: "bg-emerald-400", chip: "bg-emerald-50 text-emerald-700" },
  { key: "31-60", label: "31 a 60 dias", color: "bg-sky-400", chip: "bg-sky-50 text-sky-700" },
  { key: "61-90", label: "61 a 90 dias", color: "bg-amber-400", chip: "bg-amber-50 text-amber-700" },
  { key: "90+", label: "Mais de 90 dias", color: "bg-red-400", chip: "bg-red-50 text-red-700" },
];
const SORTS = {
  dias: "Mais tempo na loja",
  preco: "Maior preço",
  fipe: "Mais acima da FIPE",
  oscilacao: "Maior queda da FIPE",
  margem: "Menor margem",
  visitas: "Menos visitas",
} as const;

export default async function StockPage({ searchParams }: { searchParams: Promise<{ faixa?: string; ordem?: string }> }) {
  const ctx = await requireStoreUser();
  const owner = canSeeFinance(ctx);
  const sp = await searchParams;
  const [rows, toSell] = await Promise.all([loadStock(ctx.storeId), averageDaysToSell(ctx.storeId)]);
  const sort = (sp.ordem && sp.ordem in SORTS ? sp.ordem : "dias") as keyof typeof SORTS;
  const bucket = BUCKETS.find((b) => b.key === sp.faixa)?.key;

  const total = rows.length;
  const avgDays = total ? Math.round(rows.reduce((s, r) => s + r.m.days, 0) / total) : 0;
  const stale = rows.filter((r) => r.m.bucket === "90+").length;
  const priceSum = rows.reduce((s, r) => s + r.m.price, 0);
  const costSum = rows.reduce((s, r) => s + r.f.cost, 0);
  const withFipe = rows.filter((r) => r.m.fipeLast);
  const fipeSum = withFipe.reduce((s, r) => s + (r.m.fipeLast ?? 0), 0);
  const priceWithFipe = withFipe.reduce((s, r) => s + r.m.price, 0);

  const list = rows
    .filter((r) => !bucket || r.m.bucket === bucket)
    .sort((a, b) => {
      switch (sort) {
        case "preco": return b.m.price - a.m.price;
        case "fipe": return (b.m.vsFipe ?? -999) - (a.m.vsFipe ?? -999);
        case "oscilacao": return (a.m.fipeChange ?? 999) - (b.m.fipeChange ?? 999);
        case "margem": return (a.f.margin ?? 999) - (b.f.margin ?? 999);
        case "visitas": return a.v.views - b.v.views;
        default: return b.m.days - a.m.days;
      }
    });
  const link = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ faixa: sp.faixa, ordem: sp.ordem, ...p })) if (v) u.set(k, v);
    return `/painel/estoque?${u}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Controle de estoque"
        subtitle="Tempo de cada veículo na loja, FIPE e preço. Use para decidir o que destacar ou reajustar."
        actions={owner && total > 0 ? <a href="/painel/estoque/csv" className="btn-secondary"><Download className="h-4 w-4" /> Exportar planilha</a> : undefined}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={Boxes} label="Em estoque" value={total} hint={`${rows.filter((r) => r.v.status === "PREPARING").length} em preparação`} />
        <StatCard icon={Hourglass} tone="amber" label="Tempo médio na loja" value={`${avgDays} dias`} hint={`${stale} com mais de 90 dias`} href={link({ faixa: "90+" })} />
        <StatCard icon={Timer} tone="green" label="Tempo médio para vender" value={toSell ? `${toSell.days} dias` : "—"} hint={toSell ? `${toSell.count} venda(s) nos últimos 6 meses` : "Sem vendas nos últimos 6 meses"} />
        {owner ? (
          <StatCard icon={Wallet} tone="violet" label="Investido / à venda por" value={formatMoney(costSum)} hint={`Preço total: ${formatMoney(priceSum)}`} />
        ) : (
          <StatCard icon={Wallet} tone="violet" label="Valor do estoque" value={formatMoney(priceSum)} />
        )}
      </div>

      {total > 0 && (
        <Section icon={Hourglass} tone="amber" title="Tempo na loja" description="Toque numa faixa para filtrar.">
          <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
            {BUCKETS.map((b) => {
              const n = rows.filter((r) => r.m.bucket === b.key).length;
              return n ? <span key={b.key} className={b.color} style={{ width: `${(n / total) * 100}%` }} title={`${b.label}: ${n}`} /> : null;
            })}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BUCKETS.map((b) => {
              const n = rows.filter((r) => r.m.bucket === b.key).length;
              return (
                <Link key={b.key} href={link({ faixa: bucket === b.key ? undefined : b.key })}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${bucket === b.key ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"}`}>
                  <span className={`h-3 w-3 rounded-full ${b.color}`} />
                  <span className="text-sm text-slate-600">{b.label}</span>
                  <span className="ml-auto font-bold text-slate-900">{n}</span>
                </Link>
              );
            })}
          </div>
          {withFipe.length > 0 && (
            <p className="mt-5 flex items-center gap-2 text-sm text-slate-600">
              <Gauge className="h-4 w-4 text-amber-500" />
              {withFipe.length} veículo(s) com FIPE: preço total {formatPercent(((priceWithFipe - fipeSum) / fipeSum) * 100)} em relação à FIPE.
            </p>
          )}
        </Section>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <ArrowDownUp className="h-4 w-4 shrink-0 text-slate-400" />
        {Object.entries(SORTS).filter(([k]) => owner || k !== "margem").map(([k, label]) => (
          <Link key={k} href={link({ ordem: k })} className={`btn shrink-0 border py-2 ${sort === k ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600"}`}>{label}</Link>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card"><EmptyState icon={Boxes} title="Nenhum veículo nesta faixa" /></div>
      ) : (
        <ul className="space-y-3">
          {list.map(({ v, m, f }) => {
            const b = BUCKETS.find((x) => x.key === m.bucket)!;
            return (
              <li key={v.id}>
                <Link href={`/painel/veiculos/${v.id}?aba=ficha`} className="card flex flex-col gap-4 p-4 transition hover:border-slate-300 sm:p-5 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {v.photos[0] ? <VehiclePhoto url={v.photos[0].thumbUrl} alt="" /> : <div className="flex h-full items-center justify-center text-slate-300"><ImageOff className="h-5 w-5" /></div>}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-semibold text-slate-900">{vehicleTitle(v)} {v.yearModel}</p>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <span className={`badge ${b.chip}`}>{m.days} dias</span>
                        <span className="badge bg-slate-100 text-slate-600">{vehicleStatusLabels[v.status]}</span>
                        {!v.published && <span className="badge bg-slate-100 text-slate-600">Fora do site</span>}
                        {m.priceChanges > 0 && <span className="badge bg-slate-100 text-slate-600">{m.priceChanges} ajuste(s) de preço</span>}
                      </div>
                    </div>
                  </div>
                  <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm sm:grid-cols-5 lg:w-[560px] lg:shrink-0">
                    <div><dt className="text-xs text-slate-500">Preço</dt><dd className="font-semibold text-slate-900">{formatMoney(m.price)}</dd></div>
                    <div><dt className="text-xs text-slate-500">× FIPE</dt><dd className={`font-semibold ${m.vsFipe === null ? "text-slate-400" : m.vsFipe > 5 ? "text-amber-700" : "text-slate-900"}`}>{m.vsFipe === null ? "—" : formatPercent(m.vsFipe)}</dd></div>
                    <div><dt className="text-xs text-slate-500">FIPE no período</dt><dd className={`font-semibold ${m.fipeChange === null ? "text-slate-400" : m.fipeChange < 0 ? "text-red-600" : "text-emerald-700"}`}>{m.fipeChange === null ? "—" : formatPercent(m.fipeChange)}</dd></div>
                    {owner && <div><dt className="text-xs text-slate-500">Margem</dt><dd className={`font-semibold ${f.margin === null ? "text-slate-400" : f.margin < 5 ? "text-red-600" : "text-slate-900"}`}>{f.margin === null ? "—" : formatPercent(f.margin)}</dd></div>}
                    <div><dt className="text-xs text-slate-500">Visitas · contatos</dt><dd className="font-semibold text-slate-900">{v.views} · {v._count.leads}</dd></div>
                  </dl>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {owner && total > 0 && <p className="flex items-center gap-2 text-xs text-slate-400"><TrendingUp className="h-3.5 w-3.5" /> Margem = lucro previsto sobre o custo (compra + gastos + débitos).</p>}
    </div>
  );
}
