"use client";
import { useTransition } from "react";
import { Check, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { deleteEntry, setEntryPaid } from "@/app/actions/finance";
import { setTaxPaid } from "@/app/actions/management";
import { setPaymentPaid } from "@/app/actions/sales";

export function MovementActions({ entryId, taxId, paymentId, paid, grouped }: { entryId?: string; taxId?: string; paymentId?: string; paid: boolean; grouped?: boolean }) {
  const [pending, start] = useTransition();
  const toggle = () =>
    start(async () => {
      if (entryId) await setEntryPaid(entryId, !paid);
      else if (taxId) await setTaxPaid(taxId, !paid);
      else if (paymentId) await setPaymentPaid(paymentId, !paid);
    });
  if (!entryId && !taxId && !paymentId) return null;
  return (
    <div className="flex items-center gap-1">
      <button type="button" disabled={pending} onClick={toggle} className={paid ? "btn-ghost px-2.5 py-1.5 text-xs" : "btn-secondary px-3 py-1.5 text-xs"}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : paid ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
        {paid ? "Reabrir" : "Baixar"}
      </button>
      {entryId && (
        <button type="button" disabled={pending} className="btn-ghost px-2.5 py-1.5 text-red-600 hover:bg-red-50" aria-label="Excluir lançamento"
          onClick={() => {
            if (!confirm("Excluir este lançamento?")) return;
            const all = grouped && confirm("Excluir também as próximas repetições em aberto? (OK = sim, Cancelar = só este)");
            start(() => deleteEntry(entryId, Boolean(all)));
          }}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
