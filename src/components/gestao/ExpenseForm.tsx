"use client";
import { Plus } from "lucide-react";
import { addExpense, deleteExpense } from "@/app/actions/management";
import { expenseCategoryLabels } from "@/lib/labels";
import { useFormAction } from "@/lib/use-form-action";
import { FieldError, FormMessage } from "../FormMessage";
import { DeleteButton, FileInput, useResetOnSuccess } from "./shared";

export function ExpenseForm({ vehicleId, today }: { vehicleId: string; today: string }) {
  const { state, onSubmit, pending } = useFormAction(addExpense);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-4 rounded-xl bg-slate-50 p-4 sm:p-5">
      <p className="text-sm font-semibold text-slate-700">Lançar gasto</p>
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="exp-category">Categoria</label>
          <select id="exp-category" name="category" className="input" defaultValue="MECHANICS">
            {Object.entries(expenseCategoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="exp-description">Descrição</label>
          <input id="exp-description" name="description" required className="input" placeholder="Troca de óleo e filtros" />
          <FieldError state={state} name="description" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="exp-amount">Valor (R$)</label>
          <input id="exp-amount" name="amount" required inputMode="decimal" className="input" placeholder="350" />
          <FieldError state={state} name="amount" />
        </div>
        <div>
          <label className="label" htmlFor="exp-date">Data</label>
          <input id="exp-date" name="date" type="date" required defaultValue={today} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="exp-supplier">Fornecedor</label>
          <input id="exp-supplier" name="supplier" className="input" placeholder="Oficina do João" />
        </div>
      </div>
      <FileInput />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" className="btn-primary" disabled={pending}>
          <Plus className="h-4 w-4" /> {pending ? "Lançando..." : "Lançar gasto"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function DeleteExpense({ id }: { id: string }) {
  return <DeleteButton onDelete={() => deleteExpense(id)} confirmText="Excluir este gasto?" />;
}
