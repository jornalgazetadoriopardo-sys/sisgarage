"use client";
import { useTransition } from "react";
import { Check, Plus, RotateCcw } from "lucide-react";
import { addTax, deleteTax, setTaxPaid } from "@/app/actions/management";
import { taxKindLabels } from "@/lib/labels";
import { useFormAction } from "@/lib/use-form-action";
import { FieldError, FormMessage } from "../FormMessage";
import { DeleteButton, FileInput, useResetOnSuccess } from "./shared";

export function TaxForm({ vehicleId }: { vehicleId: string }) {
  const { state, onSubmit, pending } = useFormAction(addTax);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-4 rounded-xl bg-slate-50 p-4 sm:p-5">
      <p className="text-sm font-semibold text-slate-700">Lançar débito</p>
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="tax-kind">Tipo</label>
          <select id="tax-kind" name="kind" className="input" defaultValue="IPVA">
            {Object.entries(taxKindLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="tax-description">Descrição</label>
          <input id="tax-description" name="description" className="input" placeholder="IPVA 2027, multa por velocidade..." />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="tax-amount">Valor (R$)</label>
          <input id="tax-amount" name="amount" required inputMode="decimal" className="input" />
          <FieldError state={state} name="amount" />
        </div>
        <div>
          <label className="label" htmlFor="tax-due">Vencimento</label>
          <input id="tax-due" name="dueDate" type="date" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="tax-paid">Pago em (se já pago)</label>
          <input id="tax-paid" name="paidAt" type="date" className="input" />
        </div>
      </div>
      <FileInput label="Anexar guia ou comprovante" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" className="btn-primary" disabled={pending}>
          <Plus className="h-4 w-4" /> {pending ? "Lançando..." : "Lançar débito"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function TaxActions({ id, paid }: { id: string; paid: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-1">
      <button type="button" disabled={pending} onClick={() => start(() => setTaxPaid(id, !paid))}
        className={paid ? "btn-ghost px-2.5 py-1.5 text-xs" : "btn-secondary px-3 py-1.5 text-xs"}>
        {paid ? <><RotateCcw className="h-3.5 w-3.5" /> Reabrir</> : <><Check className="h-3.5 w-3.5" /> Marcar pago</>}
      </button>
      <DeleteButton onDelete={() => deleteTax(id)} confirmText="Excluir este débito?" />
    </div>
  );
}
