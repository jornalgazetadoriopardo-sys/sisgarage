import Link from "next/link";
import type { Prisma, VehicleStatus } from "@prisma/client";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatKm, formatPrice, vehicleTitle } from "@/lib/format";
import { vehicleStatusLabels } from "@/lib/labels";
import { VehicleSortList } from "@/components/VehicleSortList";

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
  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    include: {
      photos: { orderBy: { position: "asc" }, take: 1, select: { thumbUrl: true } },
      _count: { select: { photos: true, leads: true } },
    },
  });
  const filtered = Boolean(q?.trim() || status);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Veículos ({vehicles.length})</h1>
        <Link href="/painel/veiculos/novo" className="btn-primary">+ Novo veículo</Link>
      </div>
      <form className="flex flex-col gap-2 sm:flex-row">
        <input name="q" defaultValue={q} placeholder="Buscar por marca, modelo ou placa" className="input flex-1" />
        <select name="status" defaultValue={status ?? ""} className="input sm:w-48">
          <option value="">Todas as situações</option>
          {Object.entries(vehicleStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-secondary">Filtrar</button>
      </form>

      {vehicles.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-500">Nenhum veículo encontrado.</p>
          <Link href="/painel/veiculos/novo" className="btn-primary mt-4">Cadastrar o primeiro</Link>
        </div>
      ) : (
        <VehicleSortList
          key={vehicles.map((v) => `${v.id}${v.updatedAt.getTime()}`).join()}
          sortable={!filtered}
          rows={vehicles.map((v) => ({
            id: v.id,
            title: vehicleTitle(v),
            subtitle: `${v.yearManufacture}/${v.yearModel} · ${formatKm(v.mileage)} · ${v.plate ?? "sem placa"}`,
            stats: `${v._count.photos} foto(s) · ${v._count.leads} contato(s) · ${v.views} visualização(ões)`,
            price: formatPrice(v.price),
            status: v.status,
            published: v.published,
            featured: v.featured,
            thumb: v.photos[0]?.thumbUrl ?? null,
          }))}
        />
      )}
    </div>
  );
}
