"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Vehicle, VehicleType } from "@prisma/client";
import { createVehicle, lookupPlateAction, updateVehicle } from "@/app/actions/vehicles";
import {
  FEATURES_BY_TYPE,
  fuelLabels,
  transmissionLabels,
  vehicleStatusLabels,
  vehicleTypeLabels,
} from "@/lib/labels";
import { useFormAction } from "@/lib/use-form-action";
import { uploadPhotoQueue, type QueueItem } from "@/lib/photo-queue";
import { FieldError, FormMessage } from "./FormMessage";
import { PhotoDropzone } from "./PhotoDropzone";
import { UploadQueue } from "./PhotoManager";

/** Só os campos do anúncio: dados de compra/custos nunca vão para este componente. */
export type VehicleFormData = Pick<
  Vehicle,
  | "id" | "type" | "brand" | "model" | "version" | "yearManufacture" | "yearModel" | "mileage" | "color" | "fuel"
  | "transmission" | "doors" | "engine" | "plate" | "renavam" | "chassis" | "description" | "status" | "published"
  | "featured" | "featuredLabel"
> & {
  price: string;
  previousPrice: string | null;
  features: string[];
};

function moneyInput(v: string | null | undefined) {
  if (!v) return "";
  return Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function VehicleForm({
  vehicle,
  plateLookupEnabled,
  storeFeatures = [],
}: {
  vehicle?: VehicleFormData;
  plateLookupEnabled: boolean;
  storeFeatures?: string[];
}) {
  const router = useRouter();
  const { state, onSubmit, pending } = useFormAction(vehicle ? updateVehicle : createVehicle);
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<VehicleType>(vehicle?.type ?? "CAR");
  const [dirty, setDirty] = useState(false);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  const [looking, startLookup] = useTransition();
  // fotos escolhidas no cadastro (enviadas depois que o veículo é criado)
  const [files, setFiles] = useState<{ key: string; file: File; preview: string }[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const suggestions = [...new Set([...FEATURES_BY_TYPE[type], ...storeFeatures])];
  const extraFeatures = (vehicle?.features ?? []).filter((f) => !suggestions.includes(f));

  // Aviso ao sair com alterações não salvas
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    if (state.message && !state.error) setDirty(false);
  }, [state]);

  // Depois de criado: envia as fotos e abre a página de edição
  useEffect(() => {
    const id = state.id;
    if (!id) return;
    (async () => {
      if (files.length) {
        setQueue(files.map((f) => ({ key: f.key, name: f.file.name, preview: f.preview, status: "waiting" })));
        const failures = await uploadPhotoQueue(id, files, (key, patch) =>
          setQueue((q) => q.map((x) => (x.key === key ? { ...x, ...patch } : x))),
        );
        router.push(`/painel/veiculos/${id}?salvo=1${failures ? `&falhas=${failures}` : ""}`);
      } else {
        router.push(`/painel/veiculos/${id}?salvo=1`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.id]);

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
      setDirty(true);
      setLookupMsg("Dados preenchidos. Confira antes de salvar.");
    });
  }

  const busy = pending || Boolean(state.id);
  const isCar = type === "CAR";
  const isMoto = type === "MOTORCYCLE";

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        setDirty(false);
        onSubmit(e);
      }}
      onChange={() => setDirty(true)}
      className="space-y-8"
    >
      {vehicle && <input type="hidden" name="id" value={vehicle.id} />}

      <section className="card space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Identificação</h2>
          <p className="text-sm text-slate-500">
            Placa, Renavam e chassi são internos. No site aparece só o final da placa.
          </p>
        </div>
        <div>
          <span className="label">Tipo</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(vehicleTypeLabels).map(([k, v]) => (
              <label key={k} className={`btn cursor-pointer border ${type === k ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 bg-white text-slate-700"}`}>
                <input type="radio" name="type" value={k} checked={type === k} onChange={() => setType(k as VehicleType)} className="sr-only" />
                {v}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
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
          <FieldError state={state} name="chassis" />
        </div>
      </section>

      <section className="card space-y-5 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Características</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="brand">Marca *</label>
            <input id="brand" name="brand" required defaultValue={vehicle?.brand} className="input" placeholder={isMoto ? "Honda" : "Chevrolet"} />
            <FieldError state={state} name="brand" />
          </div>
          <div>
            <label className="label" htmlFor="model">Modelo *</label>
            <input id="model" name="model" required defaultValue={vehicle?.model} className="input" placeholder={isMoto ? "CG 160" : "Onix"} />
            <FieldError state={state} name="model" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="version">Versão</label>
          <input id="version" name="version" defaultValue={vehicle?.version ?? ""} className="input" placeholder={isMoto ? "Titan" : "1.0 Turbo LTZ"} />
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <div>
            <label className="label" htmlFor="yearManufacture">Ano fabricação *</label>
            <input id="yearManufacture" name="yearManufacture" required inputMode="numeric" maxLength={4} defaultValue={vehicle?.yearManufacture} className="input" />
            <FieldError state={state} name="yearManufacture" />
          </div>
          <div>
            <label className="label" htmlFor="yearModel">Ano modelo *</label>
            <input id="yearModel" name="yearModel" required inputMode="numeric" maxLength={4} defaultValue={vehicle?.yearModel} className="input" />
            <FieldError state={state} name="yearModel" />
          </div>
          <div>
            <label className="label" htmlFor="mileage">Km</label>
            <input id="mileage" name="mileage" inputMode="numeric" defaultValue={vehicle ? vehicle.mileage.toLocaleString("pt-BR") : ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="color">Cor</label>
            <input id="color" name="color" list="cores" defaultValue={vehicle?.color ?? ""} className="input" />
            <datalist id="cores">
              {["Branco", "Preto", "Prata", "Cinza", "Vermelho", "Azul", "Verde", "Bege", "Marrom", "Amarelo", "Laranja"].map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <div>
            <label className="label" htmlFor="engine">{isMoto ? "Cilindrada" : "Motor"}</label>
            <input id="engine" name="engine" defaultValue={vehicle?.engine ?? ""} className="input" placeholder={isMoto ? "160 cc" : "1.0 Turbo"} />
          </div>
          <div>
            <label className="label" htmlFor="fuel">Combustível</label>
            <select id="fuel" name="fuel" defaultValue={vehicle?.fuel ?? (isMoto ? "GASOLINE" : "FLEX")} className="input">
              {Object.entries(fuelLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="transmission">Câmbio</label>
            <select id="transmission" name="transmission" defaultValue={vehicle?.transmission ?? "MANUAL"} className="input">
              {Object.entries(transmissionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {isCar && (
            <div>
              <label className="label" htmlFor="doors">Portas</label>
              <select id="doors" name="doors" defaultValue={vehicle?.doors ?? ""} className="input">
                <option value="">—</option>
                {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}
        </div>
      </section>

      <section className="card space-y-5 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Opcionais</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {suggestions.map((f) => (
            <label key={f} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="features" value={f} defaultChecked={vehicle?.features.includes(f)} className="h-4 w-4" />
              {f}
            </label>
          ))}
        </div>
        <div>
          <label className="label" htmlFor="extraFeatures">Outros opcionais (separe por vírgula)</label>
          <input id="extraFeatures" name="extraFeatures" defaultValue={extraFeatures.join(", ")} className="input" placeholder="Ex.: Engate, Película" />
        </div>
      </section>

      <section className="card space-y-5 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Preço e anúncio</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="price">Preço de venda (R$) *</label>
            <input id="price" name="price" required inputMode="decimal" defaultValue={moneyInput(vehicle?.price)} className="input" placeholder="45.900" />
            <FieldError state={state} name="price" />
          </div>
          <div>
            <label className="label" htmlFor="previousPrice">Preço “De” (opcional)</label>
            <input id="previousPrice" name="previousPrice" inputMode="decimal" defaultValue={moneyInput(vehicle?.previousPrice)} className="input" placeholder="49.900" />
            <p className="mt-1 text-xs text-slate-500">Aparece riscado só se for maior que o preço.</p>
          </div>
          <div>
            <label className="label" htmlFor="status">Situação</label>
            <select id="status" name="status" defaultValue={vehicle?.status ?? "AVAILABLE"} className="input">
              {Object.entries(vehicleStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-3 sm:items-end">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="published" defaultChecked={vehicle?.published ?? true} className="h-4 w-4" />
            Publicar no site
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="featured" defaultChecked={vehicle?.featured ?? false} className="h-4 w-4" />
            Destaque (selo)
          </label>
          <div>
            <label className="label" htmlFor="featuredLabel">Texto do selo</label>
            <input id="featuredLabel" name="featuredLabel" maxLength={40} defaultValue={vehicle?.featuredLabel ?? ""} className="input" placeholder="Destaque, Único dono, Baixa km..." />
          </div>
        </div>
        <p className="text-xs text-slate-500">Aparecem no site apenas veículos publicados com situação “À venda” ou “Reservado”.</p>
        <div>
          <label className="label" htmlFor="description">Descrição</label>
          <textarea id="description" name="description" rows={5} defaultValue={vehicle?.description ?? ""} className="input"
            placeholder="Estado de conservação, revisões, histórico..." />
        </div>
      </section>

      {!vehicle && (
        <section className="card space-y-4 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Fotos</h2>
          {queue.length > 0 ? (
            <UploadQueue queue={queue} />
          ) : (
            <>
              {files.length > 0 && (
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {files.map((f, i) => (
                    <li key={f.key} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
                      <img src={f.preview} alt="" className="h-full w-full object-cover" />
                      {i === 0 && <span className="badge absolute left-1 top-1 bg-brand-600 text-white">Capa</span>}
                      <button type="button" aria-label="Remover" onClick={() => setFiles((x) => x.filter((y) => y.key !== f.key))}
                        className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-white">×</button>
                    </li>
                  ))}
                </ul>
              )}
              <PhotoDropzone
                disabled={busy}
                onFiles={(list) =>
                  setFiles((prev) => [
                    ...prev,
                    ...list.map((file, i) => ({ key: `${Date.now()}-${i}`, file, preview: URL.createObjectURL(file) })),
                  ])
                }
              />
              <p className="text-xs text-slate-500">As fotos são enviadas logo depois de salvar. Você pode reordenar depois.</p>
            </>
          )}
        </section>
      )}

      <div className="sticky bottom-[92px] z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center lg:bottom-4">
        <button type="submit" className="btn-primary" disabled={busy}>
          {state.id ? "Enviando fotos..." : pending ? "Salvando..." : vehicle ? "Salvar alterações" : "Cadastrar veículo"}
        </button>
        {dirty && !busy && <span className="text-xs text-amber-700">Alterações não salvas</span>}
        <div className="flex-1">{!state.id && <FormMessage state={state} />}</div>
      </div>
    </form>
  );
}
