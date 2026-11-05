import Link from "next/link";
import { Gauge, Info } from "lucide-react";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney, formatPercent, vehicleTitle } from "@/lib/format";
import { FipeLookup } from "@/components/gestao/FipeLookup";
import { PageHeader, Section } from "@/components/ui";

export default async function FipePage() {
  const { storeId } = await requireStoreUser();
  const linked = await prisma.vehicle.findMany({
    where: { storeId, status: { not: "SOLD" }, fipeValue: { not: null } },
    orderBy: { fipeCheckedAt: "desc" },
    select: { id: true, brand: true, model: true, version: true, yearModel: true, price: true, fipeValue: true, fipeReference: true },
  });
  const pending = await prisma.vehicle.count({ where: { storeId, status: { not: "SOLD" }, fipeValue: null } });

  return (
    <div className="space-y-8">
      <PageHeader title="Tabela FIPE" subtitle="Consulte o preço de referência de qualquer carro, moto ou caminhão." />

      <Section icon={Gauge} tone="amber" title="Consultar" description="Escolha o tipo, a marca, o modelo e o ano.">
        <FipeLookup />
      </Section>

      <Section icon={Info} tone="blue" title="Seu estoque × FIPE"
        description={pending ? `${pending} veículo(s) ainda sem FIPE vinculada. Abra o veículo → aba Gestão → Tabela FIPE.` : "Todos os veículos em estoque têm FIPE vinculada."}>
        {linked.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Nenhum veículo vinculado ainda. Para vincular, abra um veículo em <Link href="/painel/veiculos" className="font-medium text-brand-600">Veículos</Link> e use a aba <strong>Gestão</strong>.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {linked.map((v) => {
              const fipe = Number(v.fipeValue);
              const diff = ((Number(v.price) - fipe) / fipe) * 100;
              return (
                <li key={v.id}>
                  <Link href={`/painel/veiculos/${v.id}?aba=gestao`} className="flex flex-col gap-2 py-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{vehicleTitle(v)} {v.yearModel}</p>
                      <p className="text-xs text-slate-500">Referência {v.fipeReference}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-500">FIPE <strong className="text-slate-900">{formatMoney(fipe)}</strong></span>
                      <span className="text-slate-500">Venda <strong className="text-slate-900">{formatMoney(Number(v.price))}</strong></span>
                      <span className={`badge ${diff > 5 ? "bg-amber-50 text-amber-700" : diff < -5 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{formatPercent(diff)}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
