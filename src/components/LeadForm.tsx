"use client";
import { createLead } from "@/app/actions/leads";
import { useFormAction } from "@/lib/use-form-action";
import { FieldError, FormMessage } from "./FormMessage";

export function LeadForm({ vehicleId, vehicleName }: { vehicleId: string; vehicleName: string }) {
  const { state, onSubmit, pending } = useFormAction(createLead);
  if (state.message) return <FormMessage state={state} />;
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <div>
        <label className="label" htmlFor="lead-name">Nome</label>
        <input id="lead-name" name="name" required className="input" autoComplete="name" />
        <FieldError state={state} name="name" />
      </div>
      <div>
        <label className="label" htmlFor="lead-phone">Telefone / WhatsApp</label>
        <input id="lead-phone" name="phone" required className="input" inputMode="tel" autoComplete="tel" placeholder="(51) 99999-9999" />
        <FieldError state={state} name="phone" />
      </div>
      <div>
        <label className="label" htmlFor="lead-email">E-mail (opcional)</label>
        <input id="lead-email" name="email" type="email" className="input" autoComplete="email" />
        <FieldError state={state} name="email" />
      </div>
      <div>
        <label className="label" htmlFor="lead-message">Mensagem</label>
        <textarea id="lead-message" name="message" rows={3} className="input"
          defaultValue={`Olá, tenho interesse no ${vehicleName}. Ainda está disponível?`} />
      </div>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar mensagem"}
      </button>
    </form>
  );
}
