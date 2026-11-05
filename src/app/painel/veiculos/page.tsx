import Link from "next/link";
import { Car, Plus, Search } from "lucide-react";
import type { Prisma, VehicleStatus } from "@prisma/client";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatKm, formatPrice, vehicleTitle } from "@/lib/format";
import { vehicleStatusLabels } from "@/lib/labels";
import { VehicleSortList } from "@/components/VehicleSortList";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function PanelVehicles({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { storeId } = await requireStoreUser();
  const { q, status } = await searchParams;

  const where: Prisma.VehicleWhereInput = { storeId };
  if (status && status in vehicleStatusLabels) where.status = status as VehicleStatus;
  if (q?.trim()) {
    const term = q.trim();
    where.OR = [
      { brand: { contains: term } },
      { model: { contains: term } },
      { version: { contains: term } },
      { plate: { contains: term.toUpperCase().replace(/[^A-Z0-9]/g, "") } },
    ];
  }
  const [vehicles, counts] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      include: {
        photos: { orderBy: { position: "asc" }, take: 1, select: { thumbUrl: true } },
        documents: { where: { status: "PENDING" }, select: { id: true } },
        _count: { select: { photos: true, leads: true } },
      },
    }),
    prisma.vehicle.groupBy({ by: ["status"], where: { storeId }, _count: { _all: true } }),
  ]);
  const filtered = Boolean(q?.trim() || status);
  const total = counts.reduce((s, c) => s + c._count._all, 0);
  const tabs = [["", "Todos", total], ...Object.entries(vehicleStatusLabels).map(([k, l]) => [k, l, counts.find((c) => c.status === k)?._count._all ?? 0])] as [string, string, number][];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Veículos"
        subtitle={`${total} veículo(s) no cadastro da loja`}
        actions={<Link href="/painel/veiculos/novo" className="btn-primary"><Plus className="h-4 w-4" /> Novo veículo</Link>}
      />

      <div className="space-y-4">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {tabs.map(([k, label, n]) => (
            <Link key={k} href={k ? `/painel/veiculos?status=${k}` : "/painel/veiculos"}
              className={`btn shrink-0 border ${(status ?? "") === k ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
              {label} <span className="text-xs font-normal opacity-70">{n}</span>
            </Link>
          ))}
        </div>
        <form className="relative">
          {status && <input type="hidden" name="status" value={status} />}
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={q} placeholder="Buscar por marca, modelo ou placa" className="input py-3 pl-10" />
        </form>
      </div>

      {vehicles.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Car}
            title={filtered ? "Nenhum veículo encontrado" : "Seu estoque está vazio"}
            text={filtered ? "Tente outra busca ou limpe os filtros." : "Cadastre o primeiro veículo. Leva só alguns minutos."}
            action={!filtered && <Link href="/painel/veiculos/novo" className="btn-primary"><Plus className="h-4 w-4" /> Cadastrar veículo</Link>}
          />
        </div>
      ) : (
        <VehicleSortList
          key={vehicles.map((v) => `${v.id}${v.updatedAt.getTime()}`).join()}
          sortable={!filtered}
          rows={vehicles.map((v) => ({
            id: v.id,
            title: vehicleTitle(v),
            subtitle: `${v.yearManufacture}/${v.yearModel} · ${formatKm(v.mileage)}${v.plate ? ` · ${v.plate}` : ""}`,
            stats: `${v._count.photos} foto(s) · ${v._count.leads} contato(s) · ${v.views} visualização(ões)`,
            price: formatPrice(v.price),
            status: v.status,
            published: v.published,
            featured: v.featured,
            thumb: v.photos[0]?.thumbUrl ?? null,
            alerts: [
              ...(v._count.photos === 0 ? ["Sem foto"] : []),
              ...(v.documents.length ? [`${v.documents.length} documento(s) pendente(s)`] : []),
            ],
          }))}
        />
      )}
    </div>
  );
}
