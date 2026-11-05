"use client";
import { useState, useTransition } from "react";
import { Check, RotateCcw, XCircle } from "lucide-react";
import { cancelSale, setPaymentPaid } from "@/app/actions/sales";
import { useFormAction } from "@/lib/use-form-action";
import { FieldError, FormMessage } from "./FormMessage";

export function CancelSale({ saleId }: { saleId: string }) {
  const [open, setOpen] = useState(false);
  const { state, onSubmit, pending } = useFormAction(cancelSale);
  if (state.message) return <FormMessage state={state} />;
  if (!open) return <button type="button" className="btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setOpen(true)}><XCircle className="h-4 w-4" /> Cancelar venda</button>;
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={saleId} />
      <label className="label" htmlFor="reason">Motivo do cancelamento</label>
      <input id="reason" name="reason" className="input" required placeholder="Ex.: cliente desistiu, financiamento negado" />
      <FieldError state={state} name="reason" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-danger" disabled={pending}>{pending ? "Cancelando..." : "Confirmar cancelamento"}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Voltar</button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function PaymentPaidToggle({ id, paid }: { id: string; paid: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => setPaymentPaid(id, !paid))}
      className={paid ? "btn-ghost px-2.5 py-1.5 text-xs" : "btn-secondary px-3 py-1.5 text-xs"}>
      {paid ? <><RotateCcw className="h-3.5 w-3.5" /> Reabrir</> : <><Check className="h-3.5 w-3.5" /> Recebido</>}
    </button>
  );
}
