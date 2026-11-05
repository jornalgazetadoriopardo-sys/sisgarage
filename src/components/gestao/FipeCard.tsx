"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, RefreshCw } from "lucide-react";
import { linkFipe, refreshFipe } from "@/app/actions/management";
import type { ActionState } from "@/lib/action-state";
import { FormMessage } from "../FormMessage";
import { FipeSelector, type FipeSelection } from "./FipeSelector";

type Linked = { name: string; code: string; value: number; reference: string; checkedAt: string } | null;

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
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
  const [sel, setSel] = useState<FipeSelection | null>(null);
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();

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
        <div className="space-y-5">
          <FipeSelector
            defaultKind={defaultKind}
            brandHint={brandHint}
            modelHint={modelHint}
            yearHint={yearHint}
            onChange={setSel}
            onError={(m) => setState(m ? { error: m } : {})}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" disabled={!sel || pending}
              onClick={() => sel && start(async () => {
                const r = await linkFipe(vehicleId, sel.kind, sel.brand, sel.model, sel.year);
                setState(r);
                if (!r.error) { setEditing(false); router.refresh(); }
              })}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Vincular e consultar
            </button>
            {linked && <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>}
          </div>
        </div>
      )}
      <FormMessage state={state} />
    </div>
  );
}
