"use client";
import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";

type Opt = { code: string; name: string };
export type FipeSelection = { kind: string; brand: string; model: string; year: string };

const KINDS = [
  ["carros", "Carro"],
  ["motos", "Moto"],
  ["caminhoes", "Caminhão"],
] as const;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

async function load(params: Record<string, string>): Promise<Opt[]> {
  const res = await fetch(`/api/fipe?${new URLSearchParams(params)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Falha na consulta FIPE");
  return json.items;
}

/** Tipo → marca → modelo → ano, com sugestões a partir dos dados do veículo. */
export function FipeSelector({
  defaultKind = "carros",
  brandHint = "",
  modelHint = "",
  yearHint,
  onChange,
  onError,
}: {
  defaultKind?: string;
  brandHint?: string;
  modelHint?: string;
  yearHint?: number;
  onChange: (sel: FipeSelection | null) => void;
  onError: (message: string | null) => void;
}) {
  const [kind, setKind] = useState(defaultKind);
  const [brands, setBrands] = useState<Opt[]>([]);
  const [models, setModels] = useState<Opt[]>([]);
  const [years, setYears] = useState<Opt[]>([]);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const run = async (what: string, fn: () => Promise<void>) => {
    setLoading(what);
    onError(null);
    try {
      await fn();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Falha na consulta FIPE");
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => {
    setBrands([]); setModels([]); setYears([]); setBrand(""); setModel(""); setYear("");
    run("brands", async () => {
      const list = await load({ tipo: kind });
      setBrands(list);
      if (brandHint) {
        const hit = list.find((b) => norm(b.name).includes(norm(brandHint)) || norm(brandHint).includes(norm(b.name)));
        if (hit) setBrand(hit.code);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => {
    setModels([]); setYears([]); setModel(""); setYear("");
    if (!brand) return;
    setFilter(modelHint);
    run("models", async () => setModels(await load({ tipo: kind, marca: brand })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand]);

  useEffect(() => {
    setYears([]); setYear("");
    if (!model) return;
    run("years", async () => {
      const list = await load({ tipo: kind, marca: brand, modelo: model });
      setYears(list);
      if (yearHint) {
        const hit = list.find((y) => y.name.startsWith(String(yearHint)));
        if (hit) setYear(hit.code);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  useEffect(() => {
    onChange(year ? { kind, brand, model, year } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const visibleModels = filter ? models.filter((m) => norm(m.name).includes(norm(filter))) : models;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {KINDS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setKind(k)}
            className={`btn border ${kind === k ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 bg-white text-slate-600"}`}>
            {label}
          </button>
        ))}
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="fipe-brand">Marca</label>
          <select id="fipe-brand" className="input" value={brand} onChange={(e) => setBrand(e.target.value)} disabled={!brands.length}>
            <option value="">{loading === "brands" ? "Carregando..." : "Selecione"}</option>
            {brands.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fipe-model">Modelo</label>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Filtrar modelos" value={filter} onChange={(e) => setFilter(e.target.value)} disabled={!models.length} />
          </div>
          <select id="fipe-model" className="input" value={model} onChange={(e) => setModel(e.target.value)} disabled={!models.length}>
            <option value="">{loading === "models" ? "Carregando..." : `Selecione (${visibleModels.length})`}</option>
            {visibleModels.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fipe-year">Ano</label>
          <select id="fipe-year" className="input" value={year} onChange={(e) => setYear(e.target.value)} disabled={!years.length}>
            <option value="">{loading === "years" ? "Carregando..." : "Selecione"}</option>
            {years.map((y) => <option key={y.code} value={y.code}>{y.name.replace(/^32000/, "Zero km")}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
