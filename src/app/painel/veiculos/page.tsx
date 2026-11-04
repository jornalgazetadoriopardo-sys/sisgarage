import Link from "next/link";
import type { Prisma, VehicleStatus } from "@prisma/client";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatKm, formatPrice } from "@/lib/format";
import { vehicleStatusLabels } from "@/lib/labels";
import { quickUpdateVehicle } from "@/app/actions/vehicles";
import { VehiclePhoto } from "@/components/VehiclePhoto";

const statusColors: Record<VehicleStatus, string> = {
  PREPARING: "bg-slate-100 text-slate-700",
  AVAILABLE: "bg-green-100 text-green-800",
  RESERVED: "bg-amber-100 text-amber-800",
  SOLD: "bg-blue-100 text-blue-800",
};

export default async function PanelVehicles({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { storeId } = await requireStoreUser();
  const { q, status } = await searchParams;

  const where: Prisma.VehicleWhereInput = { storeId };
  if (status && status in vehicleStatusLabels) where.status = status as VehicleStatus;
  if (q?.trim()) {
    const term = q.trim();
    where.OR = [
      { brand: { contains: term, mode: "insensitive" } },
      { model: { contains: term, mode: "insensitive" } },
      { version: { contains: term, mode: "insensitive" } },
      { plate: { contains: term.toUpperCase().replace(/[^A-Z0-9]/g, "") } },
    ];
  }
  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { photos: { orderBy: { position: "asc" }, take: 1 }, _count: { select: { photos: true, leads: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Veículos</h1>
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
        <ul className="space-y-2">
          {vehicles.map((v) => (
            <li key={v.id} className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
              <Link href={`/painel/veiculos/${v.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <VehiclePhoto url={v.photos[0]?.url} alt={v.model} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{v.brand} {v.model} {v.version}</p>
                  <p className="text-sm text-slate-500">
                    {v.yearManufacture}/{v.yearModel} · {formatKm(v.mileage)} · {v.plate ?? "sem placa"}
                  </p>
                  <p className="text-xs text-slate-400">{v._count.photos} foto(s) · {v._count.leads} contato(s) · {v.views} visualização(ões)</p>
                </div>
              </Link>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="font-bold">{formatPrice(v.price)}</span>
                <span className={`badge ${statusColors[v.status]}`}>{vehicleStatusLabels[v.status]}</span>
                <form action={quickUpdateVehicle}>
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="published" value={String(!v.published)} />
                  <button className={`badge cursor-pointer ${v.published ? "bg-green-600 text-white" : "bg-slate-200 text-slate-600"}`}
                    title={v.published ? "Clique para ocultar do site" : "Clique para publicar no site"}>
                    {v.published ? "No site" : "Oculto"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
