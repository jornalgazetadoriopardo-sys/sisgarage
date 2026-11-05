"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { addEntry } from "@/app/actions/finance";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/labels";
import { useFormAction } from "@/lib/use-form-action";
import { FieldError, FormMessage } from "../FormMessage";
import { FileInput, useResetOnSuccess } from "../gestao/shared";

export function EntryForm({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const { state, onSubmit, pending } = useFormAction(addEntry);
  const ref = useResetOnSuccess(state);
  if (!open) {
    return <button type="button" className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Novo lançamento</button>;
  }
  const cats = type === "EXPENSE" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return (
    <form ref={ref} onSubmit={onSubmit} className="card space-y-5 p-5 sm:p-6">
      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-2 gap-3">
        {([["EXPENSE", "Despesa / conta a pagar"], ["INCOME", "Receita avulsa"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setType(k)}
            className={`btn border ${type === k ? (k === "EXPENSE" ? "border-red-300 bg-red-50 text-red-700" : "border-emerald-300 bg-emerald-50 text-emerald-700") : "border-slate-200 bg-white text-slate-600"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="e-category">Categoria</label>
          <select id="e-category" name="category" className="input" key={type}>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="e-description">Descrição</label>
          <input id="e-description" name="description" required className="input" placeholder={type === "EXPENSE" ? "Aluguel do pátio" : "Comissão do banco"} />
          <FieldError state={state} name="description" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="e-amount">Valor (R$)</label>
          <input id="e-amount" name="amount" required inputMode="decimal" className="input" />
          <FieldError state={state} name="amount" />
        </div>
        <div>
          <label className="label" htmlFor="e-due">Vencimento</label>
          <input id="e-due" name="dueDate" type="date" required defaultValue={today} className="input" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label" htmlFor="e-repeat">Repetir</label>
          <select id="e-repeat" name="repeat" className="input" defaultValue="1">
            <option value="1">Não repetir</option>
            {[2, 3, 6, 12, 24].map((n) => <option key={n} value={n}>Todo mês, {n} vezes</option>)}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="paid" className="h-4 w-4" /> Já foi {type === "EXPENSE" ? "pago" : "recebido"} (o primeiro, se repetir)
      </label>
      <FileInput label="Anexar boleto ou comprovante (opcional)" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Salvando..." : "Salvar lançamento"}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Fechar</button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
