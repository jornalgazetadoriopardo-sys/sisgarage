"use client";
import { savePurchase } from "@/app/actions/management";
import { purchaseSourceLabels } from "@/lib/labels";
import { useFormAction } from "@/lib/use-form-action";
import { FieldError, FormMessage } from "../FormMessage";

export function PurchaseForm({
  vehicleId,
  values,
}: {
  vehicleId: string;
  values: { purchaseDate: string; purchasePrice: string; purchaseSource: string; purchaseFrom: string; purchasePayment: string; purchaseNotes: string };
}) {
  const { state, onSubmit, pending } = useFormAction(savePurchase);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="purchasePrice">Valor pago (R$)</label>
          <input id="purchasePrice" name="purchasePrice" inputMode="decimal" defaultValue={values.purchasePrice} className="input" placeholder="38.000" />
          <FieldError state={state} name="purchasePrice" />
        </div>
        <div>
          <label className="label" htmlFor="purchaseDate">Data da compra</label>
          <input id="purchaseDate" name="purchaseDate" type="date" defaultValue={values.purchaseDate} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="purchaseSource">Origem</label>
          <select id="purchaseSource" name="purchaseSource" defaultValue={values.purchaseSource} className="input">
            <option value="">—</option>
            {Object.entries(purchaseSourceLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="purchaseFrom">Comprado de</label>
          <input id="purchaseFrom" name="purchaseFrom" defaultValue={values.purchaseFrom} className="input" placeholder="Nome do vendedor ou loja" />
        </div>
        <div>
          <label className="label" htmlFor="purchasePayment">Forma de pagamento</label>
          <input id="purchasePayment" name="purchasePayment" defaultValue={values.purchasePayment} className="input" placeholder="PIX, transferência, troca..." />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="purchaseNotes">Observações</label>
        <textarea id="purchaseNotes" name="purchaseNotes" rows={2} defaultValue={values.purchaseNotes} className="input" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Salvando..." : "Salvar compra"}</button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
