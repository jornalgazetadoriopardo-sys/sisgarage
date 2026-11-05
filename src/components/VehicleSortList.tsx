"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
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
};

const statusColors: Record<VehicleStatus, string> = {
  PREPARING: "bg-slate-100 text-slate-700",
  AVAILABLE: "bg-green-100 text-green-800",
  RESERVED: "bg-amber-100 text-amber-800",
  SOLD: "bg-blue-100 text-blue-800",
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
      prev.map((r) =>
        r.id !== id ? r : field === "status" ? { ...r, status: value as VehicleStatus } : { ...r, [field]: value === "true" },
      ),
    );
    const fd = new FormData();
    fd.set("id", id);
    fd.set(field, value);
    start(() => quickUpdateVehicle(fd));
  };

  return (
    <>
      <p className="text-xs text-slate-500">
        {sortable ? "Arraste pela alça ⠿ para definir a ordem na vitrine da loja." : "Limpe os filtros para reordenar a vitrine."}
        {pending && " Salvando..."}
      </p>
      <ul ref={ref} className="space-y-2">
        {rows.map((v) => (
          <li key={v.id} data-id={v.id} className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {sortable && (
                <span data-handle className="cursor-grab touch-none select-none px-1 text-xl text-slate-400" aria-label="Arrastar">⠿</span>
              )}
              <Link href={`/painel/veiculos/${v.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <VehiclePhoto url={v.thumb} alt={v.title} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{v.title}</p>
                  <p className="truncate text-sm text-slate-500">{v.subtitle}</p>
                  <p className="text-xs text-slate-400">{v.stats}</p>
                </div>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span className="font-bold">{v.price}</span>
              <select
                value={v.status}
                onChange={(e) => quick(v.id, "status", e.target.value)}
                className={`badge cursor-pointer border-0 py-1 ${statusColors[v.status]}`}
                aria-label="Situação"
              >
                {Object.entries(vehicleStatusLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <button type="button" onClick={() => quick(v.id, "featured", String(!v.featured))}
                className={`badge cursor-pointer ${v.featured ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-600"}`}
                title="Destaque">★</button>
              <button type="button" onClick={() => quick(v.id, "published", String(!v.published))}
                className={`badge cursor-pointer ${v.published ? "bg-green-600 text-white" : "bg-slate-200 text-slate-600"}`}
                title={v.published ? "Clique para ocultar do site" : "Clique para publicar no site"}>
                {v.published ? "No site" : "Oculto"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
