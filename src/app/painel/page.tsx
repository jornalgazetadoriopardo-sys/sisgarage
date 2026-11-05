import Link from "next/link";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatPrice, vehicleTitle } from "@/lib/format";

export default async function PanelHome({ searchParams }: { searchParams: Promise<{ bemvindo?: string }> }) {
  const { storeId, user } = await requireStoreUser();
  const { bemvindo } = await searchParams;

  const [byStatus, published, stockValue, views, leads] = await Promise.all([
    prisma.vehicle.groupBy({ by: ["status"], where: { storeId }, _count: { _all: true } }),
    prisma.vehicle.count({ where: { storeId, published: true, status: { in: ["AVAILABLE", "RESERVED"] } } }),
    prisma.vehicle.aggregate({ where: { storeId, status: { in: ["AVAILABLE", "RESERVED", "PREPARING"] } }, _sum: { price: true } }),
    prisma.vehicle.aggregate({ where: { storeId }, _sum: { views: true } }),
    prisma.lead.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { vehicle: { select: { brand: true, model: true, version: true } } },
    }),
  ]);
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;

  const stats = [
    { label: "À venda", value: count("AVAILABLE") },
    { label: "Em preparação", value: count("PREPARING") },
    { label: "Reservados", value: count("RESERVED") },
    { label: "Vendidos", value: count("SOLD") },
    { label: "Publicados no site", value: published },
    { label: "Visualizações", value: views._sum.views ?? 0 },
  ];

  return (
    <div className="space-y-6">
      {bemvindo && (
        <div className="card border-green-200 bg-green-50 p-4 text-green-900">
          <p className="font-semibold">Loja cadastrada, {user.name.split(" ")[0]}!</p>
          <p className="text-sm">Comece cadastrando seus veículos. A aprovação da loja é feita pela equipe SisGarage.</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Visão geral</h1>
        <Link href="/painel/veiculos/novo" className="btn-primary">+ Novo veículo</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="card p-4">
        <p className="text-xs text-slate-500">Valor do estoque (preço de venda)</p>
        <p className="text-2xl font-bold">{formatPrice(stockValue._sum.price ?? 0)}</p>
      </div>
      <section className="card">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-bold">Últimos contatos</h2>
          <Link href="/painel/contatos" className="text-sm font-semibold text-brand-600">Ver todos</Link>
        </div>
        {leads.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Nenhum contato recebido ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {leads.map((l) => (
              <li key={l.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <strong>{l.name}</strong> · {l.phone}
                  {l.vehicle && <span className="text-slate-500"> — {vehicleTitle(l.vehicle)}</span>}
                </span>
                <span className="text-xs text-slate-500">{formatDate(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
