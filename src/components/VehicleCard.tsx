import Link from "next/link";
import type { PublicVehicleCard } from "@/lib/vehicles";
import { formatKm, formatPrice } from "@/lib/format";
import { fuelLabels, transmissionLabels } from "@/lib/labels";
import { VehiclePhoto } from "./VehiclePhoto";

export function VehicleCard({ vehicle: v }: { vehicle: PublicVehicleCard }) {
  return (
    <Link
      href={`/veiculos/${v.id}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-slate-100">
        <VehiclePhoto url={v.photos[0]?.url} alt={`${v.brand} ${v.model}`} />
        {v.status === "RESERVED" && (
          <span className="badge absolute left-2 top-2 bg-amber-500 text-white">Reservado</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-semibold leading-tight text-slate-900 group-hover:text-brand-600">
          {v.brand} {v.model}
        </h3>
        {v.version && <p className="line-clamp-1 text-sm text-slate-500">{v.version}</p>}
        <p className="mt-2 text-xl font-bold text-slate-900">{formatPrice(v.price)}</p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
          <span>{v.yearManufacture}/{v.yearModel}</span>
          <span>{formatKm(v.mileage)}</span>
          <span>{transmissionLabels[v.transmission]}</span>
          <span>{fuelLabels[v.fuel]}</span>
        </div>
        <p className="mt-auto pt-3 text-xs text-slate-500">
          {v.store.name} · {v.store.city}/{v.store.state}
        </p>
      </div>
    </Link>
  );
}
