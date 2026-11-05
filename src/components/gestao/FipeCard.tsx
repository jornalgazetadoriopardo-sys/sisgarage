"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, RefreshCw, Search } from "lucide-react";
import { linkFipe, refreshFipe } from "@/app/actions/management";
import type { ActionState } from "@/lib/action-state";
import { FormMessage } from "../FormMessage";

type Opt = { code: string; name: string };
type Linked = { name: string; code: string; value: number; reference: string; checkedAt: string } | null;

const KINDS = [
  ["carros", "Carro"],
  ["motos", "Moto"],
  ["caminhoes", "Caminhão"],
] as const;

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

async function load(params: Record<string, string>): Promise<Opt[]> {
  const res = await fetch(`/api/fipe?${new URLSearchParams(params)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Falha na consulta FIPE");
  return json.items;
}

export function FipeCard({
  vehicleId,
  linked,
  history,
  defaultKind,
  brandHint,
  modelHint,
  yearHint,
}: {
  vehicleId: string;
  linked: Linked;
  history: { month: string; value: number }[];
  defaultKind: string;
  brandHint: string;
  modelHint: string;
  yearHint: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(!linked);
  const [kind, setKind] = useState(defaultKind);
  const [brands, setBrands] = useState<Opt[]>([]);
  const [models, setModels] = useState<Opt[]>([]);
  const [years, setYears] = useState<Opt[]>([]);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();

  const run = async (what: string, fn: () => Promise<void>) => {
    setLoading(what);
    setState({});
    try {
      await fn();
    } catch (e) {
      setState({ error: e instanceof Error ? e.message : "Falha na consulta FIPE" });
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => {
    if (!editing) return;
    setBrands([]); setModels([]); setYears([]); setBrand(""); setModel(""); setYear("");
    run("brands", async () => {
      const list = await load({ tipo: kind });
      setBrands(list);
      const hit = list.find((b) => norm(b.name).includes(norm(brandHint)) || norm(brandHint).includes(norm(b.name)));
      if (hit) setBrand(hit.code);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, editing]);

  useEffect(() => {
    if (!brand) return;
    setModels([]); setYears([]); setModel(""); setYear("");
    setFilter(modelHint);
    run("models", async () => setModels(await load({ tipo: kind, marca: brand })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand]);

  useEffect(() => {
    if (!model) return;
    setYears([]); setYear("");
    run("years", async () => {
      const list = await load({ tipo: kind, marca: brand, modelo: model });
      setYears(list);
      const hit = list.find((y) => y.name.startsWith(String(yearHint)));
      if (hit) setYear(hit.code);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  const visibleModels = filter ? models.filter((m) => norm(m.name).includes(norm(filter))) : models;
  const max = Math.max(...history.map((h) => h.value), 1);

  return (
    <div className="space-y-5">
      {linked && !editing && (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">{linked.name}</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{money(linked.value)}</p>
              <p className="mt-1 text-xs text-slate-500">Código {linked.code} · Referência {linked.reference} · consultado em {linked.checkedAt}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" disabled={pending}
                onClick={() => start(async () => { setState(await refreshFipe(vehicleId)); router.refresh(); })}>
                <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} /> Atualizar
              </button>
              <button type="button" className="btn-ghost" onClick={() => setEditing(true)}>
                <Link2 className="h-4 w-4" /> Trocar modelo
              </button>
            </div>
          </div>
          {history.length > 1 && (
            <div>
              <p className="mb-3 text-sm font-medium text-slate-600">Histórico mensal</p>
              <ul className="flex h-32 items-end gap-2">
                {history.map((h) => (
                  <li key={h.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${h.month}: ${money(h.value)}`}>
                    <span className="w-full rounded-t-md bg-brand-200" style={{ height: `${Math.max(8, (h.value / max) * 100)}%` }} />
                    <span className="text-[10px] text-slate-500">{h.month.slice(5)}/{h.month.slice(2, 4)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {editing && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {KINDS.map(([k, label]) => (
              <button key={k} type="button" onClick={() => setKind(k)}
                className={`btn border ${kind === k ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 bg-white text-slate-600"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
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
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" disabled={!year || pending}
              onClick={() => start(async () => {
                const r = await linkFipe(vehicleId, kind, brand, model, year);
                setState(r);
                if (!r.error) { setEditing(false); router.refresh(); }
              })}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Vincular e consultar
            </button>
            {linked && <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>}
            {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>
        </div>
      )}
      <FormMessage state={state} />
    </div>
  );
}
