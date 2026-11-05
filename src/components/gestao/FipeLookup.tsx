"use client";
import { useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { consultFipe } from "@/app/actions/management";
import type { FipePrice } from "@/lib/fipe";
import { FipeSelector, type FipeSelection } from "./FipeSelector";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function FipeLookup() {
  const [sel, setSel] = useState<FipeSelection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FipePrice | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <FipeSelector onChange={(s) => { setSel(s); setResult(null); }} onError={setError} />
      <button type="button" className="btn-primary" disabled={!sel || pending}
        onClick={() => sel && start(async () => {
          const r = await consultFipe(sel.kind, sel.brand, sel.model, sel.year);
          if ("error" in r) { setError(r.error ?? null); setResult(null); } else { setError(null); setResult(r.price); }
        })}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Consultar valor
      </button>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {result && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6">
          <p className="text-sm text-slate-600">{result.name}</p>
          <p className="mt-1 text-4xl font-bold tracking-tight text-slate-900">{money(result.value)}</p>
          <p className="mt-2 text-xs text-slate-500">Código FIPE {result.code} · Referência {result.reference}</p>
        </div>
      )}
    </div>
  );
}
