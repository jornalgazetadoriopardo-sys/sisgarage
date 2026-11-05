"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Eye, EyeOff, GripVertical, ImageOff, Star } from "lucide-react";
import type { VehicleStatus } from "@prisma/client";
import { quickUpdateVehicle, reorderVehicles } from "@/app/actions/vehicles";
import { vehicleStatusLabels } from "@/lib/labels";
import { VehiclePhoto } from "./VehiclePhoto";
import { useSortable } from "./useSortable";

export type PanelVehicleRow = {
  id: string;
  title: string;
  subtitle: string;
  stats: string;
  price: string;
  status: VehicleStatus;
  published: boolean;
  featured: boolean;
  thumb: string | null;
  alerts: string[];
};

const statusColors: Record<VehicleStatus, string> = {
  PREPARING: "bg-slate-100 text-slate-700",
  AVAILABLE: "bg-emerald-50 text-emerald-700",
  RESERVED: "bg-amber-50 text-amber-700",
  SOLD: "bg-brand-50 text-brand-700",
};

export function VehicleSortList({ rows: initial, sortable }: { rows: PanelVehicleRow[]; sortable: boolean }) {
  const [rows, setRows] = useState(initial);
  const [pending, start] = useTransition();
  const ref = useSortable<HTMLUListElement>(
    (ids) => {
      setRows((prev) => ids.map((id) => prev.find((r) => r.id === id)!).filter(Boolean));
      start(() => reorderVehicles(ids));
    },
    { disabled: !sortable, handle: "[data-handle]" },
  );

  const quick = (id: string, field: "published" | "featured" | "status", value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id !== id ? r : field === "status" ? { ...r, status: value as VehicleStatus } : { ...r, [field]: value === "true" })),
    );
    const fd = new FormData();
    fd.set("id", id);
    fd.set(field, value);
    start(() => quickUpdateVehicle(fd));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {sortable ? "Arraste pela alça para definir a ordem dos veículos na vitrine da loja." : "Limpe os filtros para reordenar a vitrine."}
        {pending && " Salvando..."}
      </p>
      <ul ref={ref} className="space-y-4">
        {rows.map((v) => (
          <li key={v.id} data-id={v.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {sortable && (
                <span data-handle className="-ml-1 cursor-grab touch-none select-none text-slate-300 hover:text-slate-500" aria-label="Arrastar">
                  <GripVertical className="h-5 w-5" />
                </span>
              )}
              <Link href={`/painel/veiculos/${v.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {v.thumb ? <VehiclePhoto url={v.thumb} alt={v.title} /> : <div className="flex h-full items-center justify-center text-slate-300"><ImageOff className="h-6 w-6" /></div>}
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-semibold text-slate-900">{v.title}</p>
                  <p className="truncate text-sm text-slate-500">{v.subtitle}</p>
                  <p className="text-lg font-bold text-slate-900 sm:hidden">{v.price}</p>
                  {v.alerts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {v.alerts.map((a) => <span key={a} className="badge bg-amber-50 text-amber-700">{a}</span>)}
                    </div>
                  )}
                </div>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-3">
              <span className="hidden text-lg font-bold text-slate-900 sm:block">{v.price}</span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={v.status}
                  onChange={(e) => quick(v.id, "status", e.target.value)}
                  className={`cursor-pointer rounded-full border-0 py-1.5 pl-3 pr-8 text-xs font-semibold ${statusColors[v.status]}`}
                  aria-label="Situação"
                >
                  {Object.entries(vehicleStatusLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <button type="button" onClick={() => quick(v.id, "featured", String(!v.featured))}
                  className={`icon-box h-8 w-8 ${v.featured ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"}`}
                  title={v.featured ? "Remover destaque" : "Destacar"} aria-pressed={v.featured}>
                  <Star className="h-4 w-4" fill={v.featured ? "currentColor" : "none"} />
                </button>
                <button type="button" onClick={() => quick(v.id, "published", String(!v.published))}
                  className={`icon-box h-8 w-8 ${v.published ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}
                  title={v.published ? "No site. Clique para ocultar" : "Oculto. Clique para publicar"} aria-pressed={v.published}>
                  {v.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
