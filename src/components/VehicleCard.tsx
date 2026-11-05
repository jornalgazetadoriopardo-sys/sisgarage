import Link from "next/link";
import { Calendar, Fuel, Gauge, MapPin, Settings2 } from "lucide-react";
import type { PublicVehicleCard } from "@/lib/vehicles";
import { formatKm, formatPrice, showPreviousPrice, vehiclePath } from "@/lib/format";
import { fuelLabels, transmissionLabels } from "@/lib/labels";
import { VehiclePhoto } from "./VehiclePhoto";

export function VehicleCard({ vehicle: v, showStore = true }: { vehicle: PublicVehicleCard; showStore?: boolean }) {
  const specs = [
    { icon: Calendar, text: `${v.yearManufacture}/${v.yearModel}` },
    { icon: Gauge, text: formatKm(v.mileage) },
    ...(v.type !== "MOTORCYCLE" ? [{ icon: Settings2, text: transmissionLabels[v.transmission] }] : []),
    { icon: Fuel, text: fuelLabels[v.fuel] },
  ];
  return (
    <Link href={vehiclePath(v)} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <VehiclePhoto url={v.photos[0]?.thumbUrl} alt={`${v.brand} ${v.model}`} className="transition duration-300 group-hover:scale-[1.03]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {v.featured && <span className="badge bg-brand-600 text-white shadow">{v.featuredLabel || "Destaque"}</span>}
          {v.status === "RESERVED" && <span className="badge bg-amber-500 text-white shadow">Reservado</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold leading-tight text-slate-900 group-hover:text-brand-600">
            {v.brand} {v.model}
          </h3>
          {(v.version || v.engine) && <p className="line-clamp-1 text-sm text-slate-500">{[v.engine, v.version].filter(Boolean).join(" ")}</p>}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-slate-600">
          {specs.map((s) => (
            <span key={s.text} className="inline-flex items-center gap-1.5">
              <s.icon className="h-4 w-4 text-slate-400" /> {s.text}
            </span>
          ))}
        </div>
        <div className="mt-auto border-t border-slate-100 pt-4">
          {showPreviousPrice(v) && <p className="text-xs text-slate-400 line-through">De {formatPrice(v.previousPrice!)}</p>}
          <p className="text-2xl font-bold tracking-tight text-slate-900">{formatPrice(v.price)}</p>
          {showStore && (
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5" /> {v.store.name} · {v.store.city}/{v.store.state}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
