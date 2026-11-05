import Link from "next/link";
import type { PublicVehicleCard } from "@/lib/vehicles";
import { formatKm, formatPrice, showPreviousPrice, vehiclePath } from "@/lib/format";
import { fuelLabels, transmissionLabels } from "@/lib/labels";
import { VehiclePhoto } from "./VehiclePhoto";

export function VehicleCard({ vehicle: v, showStore = true }: { vehicle: PublicVehicleCard; showStore?: boolean }) {
  return (
    <Link
      href={vehiclePath(v)}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-slate-100">
        <VehiclePhoto url={v.photos[0]?.thumbUrl} alt={`${v.brand} ${v.model}`} />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {v.featured && <span className="badge bg-brand-600 text-white">{v.featuredLabel || "Destaque"}</span>}
          {v.status === "RESERVED" && <span className="badge bg-amber-500 text-white">Reservado</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-semibold leading-tight text-slate-900 group-hover:text-brand-600">
          {v.brand} {v.model}
        </h3>
        {(v.version || v.engine) && <p className="line-clamp-1 text-sm text-slate-500">{[v.engine, v.version].filter(Boolean).join(" ")}</p>}
        <div className="mt-2">
          {showPreviousPrice(v) && <p className="text-xs text-slate-400 line-through">De {formatPrice(v.previousPrice!)}</p>}
          <p className="text-xl font-bold text-slate-900">{showPreviousPrice(v) && <span className="text-sm font-medium text-slate-500">Por </span>}{formatPrice(v.price)}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
          <span>{v.yearManufacture}/{v.yearModel}</span>
          <span>{formatKm(v.mileage)}</span>
          {v.type !== "MOTORCYCLE" && <span>{transmissionLabels[v.transmission]}</span>}
          <span>{fuelLabels[v.fuel]}</span>
        </div>
        {showStore && (
          <p className="mt-auto pt-3 text-xs text-slate-500">
            {v.store.name} · {v.store.city}/{v.store.state}
          </p>
        )}
      </div>
    </Link>
  );
}
