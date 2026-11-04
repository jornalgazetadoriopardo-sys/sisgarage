"use client";
import { useRef, useState, useTransition } from "react";
import type { Vehicle } from "@prisma/client";
import { createVehicle, lookupPlateAction, updateVehicle } from "@/app/actions/vehicles";
import { useFormAction } from "@/lib/use-form-action";
import {
  COMMON_FEATURES,
  fuelLabels,
  transmissionLabels,
  vehicleStatusLabels,
  vehicleTypeLabels,
} from "@/lib/labels";
import { FieldError, FormMessage } from "./FormMessage";

type VehicleData = Omit<Vehicle, "price"> & { price: string };

export function VehicleForm({ vehicle, plateLookupEnabled }: { vehicle?: VehicleData; plateLookupEnabled: boolean }) {
  const { state, onSubmit, pending } = useFormAction(vehicle ? updateVehicle : createVehicle);
  const formRef = useRef<HTMLFormElement>(null);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  const [looking, startLookup] = useTransition();

  const extraFeatures = (vehicle?.features ?? []).filter((f) => !COMMON_FEATURES.includes(f));

  function fill(name: string, value: string | number | undefined) {
    const el = formRef.current?.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
    if (el && value !== undefined && value !== "") el.value = String(value);
  }

  function onLookup() {
    const form = formRef.current;
    if (!form) return;
    const plate = (form.elements.namedItem("plate") as HTMLInputElement).value;
    const renavam = (form.elements.namedItem("renavam") as HTMLInputElement).value;
    startLookup(async () => {
      const res = await lookupPlateAction(plate, renavam);
      if (!res.ok) return setLookupMsg(res.message);
      const d = res.data;
      fill("brand", d.brand);
      fill("model", d.model);
      fill("version", d.version);
      fill("yearManufacture", d.yearManufacture);
      fill("yearModel", d.yearModel);
      fill("color", d.color);
      fill("chassis", d.chassis);
      setLookupMsg("Dados preenchidos. Confira antes de salvar.");
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
      {vehicle && <input type="hidden" name="id" value={vehicle.id} />}

      <section className="card space-y-4 p-6">
        <div>
          <h2 className="text-lg font-bold">Identificação</h2>
          <p className="text-sm text-slate-500">Placa, Renavam e chassi são internos e nunca aparecem no site.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="plate">Placa</label>
            <input id="plate" name="plate" defaultValue={vehicle?.plate ?? ""} className="input uppercase" placeholder="ABC1D23" maxLength={8} />
            <FieldError state={state} name="plate" />
          </div>
          <div>
            <label className="label" htmlFor="renavam">Renavam</label>
            <input id="renavam" name="renavam" defaultValue={vehicle?.renavam ?? ""} className="input" inputMode="numeric" maxLength={11} />
            <FieldError state={state} name="renavam" />
          </div>
          <button type="button" onClick={onLookup} disabled={looking} className="btn-secondary"
            title={plateLookupEnabled ? "Preencher dados pela placa" : "Consulta por placa ainda não contratada"}>
            {looking ? "Consultando..." : "Buscar pela placa"}
          </button>
        </div>
        {lookupMsg && <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{lookupMsg}</p>}
        <div>
          <label className="label" htmlFor="chassis">Chassi</label>
          <input id="chassis" name="chassis" defaultValue={vehicle?.chassis ?? ""} className="input uppercase" maxLength={17} />
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="text-lg font-bold">Dados do veículo</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="type">Tipo</label>
            <select id="type" name="type" defaultValue={vehicle?.type ?? "CAR"} className="input">
              {Object.entries(vehicleTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="brand">Marca *</label>
            <input id="brand" name="brand" required defaultValue={vehicle?.brand} className="input" placeholder="Chevrolet" />
            <FieldError state={state} name="brand" />
          </div>
          <div>
            <label className="label" htmlFor="model">Modelo *</label>
            <input id="model" name="model" required defaultValue={vehicle?.model} className="input" placeholder="Onix" />
            <FieldError state={state} name="model" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="version">Versão</label>
          <input id="version" name="version" defaultValue={vehicle?.version ?? ""} className="input" placeholder="1.0 Turbo LTZ" />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="label" htmlFor="yearManufacture">Ano fabricação *</label>
            <input id="yearManufacture" name="yearManufacture" required inputMode="numeric" defaultValue={vehicle?.yearManufacture} className="input" />
            <FieldError state={state} name="yearManufacture" />
          </div>
          <div>
            <label className="label" htmlFor="yearModel">Ano modelo *</label>
            <input id="yearModel" name="yearModel" required inputMode="numeric" defaultValue={vehicle?.yearModel} className="input" />
            <FieldError state={state} name="yearModel" />
          </div>
          <div>
            <label className="label" htmlFor="mileage">Km</label>
            <input id="mileage" name="mileage" inputMode="numeric" defaultValue={vehicle?.mileage ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="color">Cor</label>
            <input id="color" name="color" defaultValue={vehicle?.color ?? ""} className="input" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="fuel">Combustível</label>
            <select id="fuel" name="fuel" defaultValue={vehicle?.fuel ?? "FLEX"} className="input">
              {Object.entries(fuelLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="transmission">Câmbio</label>
            <select id="transmission" name="transmission" defaultValue={vehicle?.transmission ?? "MANUAL"} className="input">
              {Object.entries(transmissionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="doors">Portas</label>
            <select id="doors" name="doors" defaultValue={vehicle?.doors ?? ""} className="input">
              <option value="">—</option>
              {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="text-lg font-bold">Anúncio</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="price">Preço de venda (R$) *</label>
            <input id="price" name="price" required inputMode="decimal" defaultValue={vehicle?.price ?? ""} className="input" placeholder="45.900" />
            <FieldError state={state} name="price" />
          </div>
          <div>
            <label className="label" htmlFor="status">Situação</label>
            <select id="status" name="status" defaultValue={vehicle?.status ?? "AVAILABLE"} className="input">
              {Object.entries(vehicleStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="published" defaultChecked={vehicle?.published ?? true} className="h-4 w-4" />
            Publicar no site
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="featured" defaultChecked={vehicle?.featured ?? false} className="h-4 w-4" />
            Destaque
          </label>
        </div>
        <p className="text-xs text-slate-500">Aparecem no site apenas veículos publicados com situação “À venda” ou “Reservado”.</p>
        <div>
          <span className="label">Itens e opcionais</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {COMMON_FEATURES.map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="features" value={f} defaultChecked={vehicle?.features.includes(f)} className="h-4 w-4" />
                {f}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="extraFeatures">Outros itens (separe por vírgula)</label>
          <input id="extraFeatures" name="extraFeatures" defaultValue={extraFeatures.join(", ")} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="description">Descrição</label>
          <textarea id="description" name="description" rows={5} defaultValue={vehicle?.description ?? ""} className="input"
            placeholder="Estado de conservação, revisões, histórico..." />
        </div>
      </section>

      {!vehicle && (
        <section className="card space-y-2 p-6">
          <h2 className="text-lg font-bold">Fotos</h2>
          <input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="input" />
          <p className="text-xs text-slate-500">JPG, PNG ou WEBP, até 8 MB cada. A primeira será a capa. Você pode reordenar depois.</p>
        </section>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-slate-200 bg-slate-50/95 px-4 py-4 sm:flex-row sm:items-center">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Salvando..." : vehicle ? "Salvar alterações" : "Cadastrar veículo"}
        </button>
        <div className="flex-1"><FormMessage state={state} /></div>
      </div>
    </form>
  );
}
