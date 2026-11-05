"use client";
import { useState } from "react";
import { CalendarClock, MessageSquare } from "lucide-react";
import { createLead } from "@/app/actions/leads";
import { useFormAction } from "@/lib/use-form-action";
import { FieldError, FormMessage } from "./FormMessage";

export function LeadForm({ vehicleId, vehicleName, minDay }: { vehicleId: string; vehicleName: string; minDay: string }) {
  const { state, onSubmit, pending } = useFormAction(createLead);
  const [mode, setMode] = useState<"" | "TEST_DRIVE" | "VISIT">("");
  if (state.message) return <FormMessage state={state} />;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="schedule" value={mode} />
      <div className="grid grid-cols-3 gap-2 text-xs font-medium">
        {([["", "Mensagem", MessageSquare], ["TEST_DRIVE", "Test drive", CalendarClock], ["VISIT", "Visita", CalendarClock]] as const).map(([k, label, Icon]) => (
          <button key={k} type="button" onClick={() => setMode(k)}
            className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 ${mode === k ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
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
      {mode && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="lead-day">Dia</label>
            <input id="lead-day" name="day" type="date" min={minDay} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="lead-time">Horário</label>
            <input id="lead-time" name="time" type="time" min="08:00" max="18:00" step={1800} required className="input" />
          </div>
          <div className="col-span-2"><FieldError state={state} name="day" /></div>
        </div>
      )}
      {!mode && (
        <div>
          <label className="label" htmlFor="lead-email">E-mail (opcional)</label>
          <input id="lead-email" name="email" type="email" className="input" autoComplete="email" />
          <FieldError state={state} name="email" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="lead-message">Mensagem</label>
        <textarea id="lead-message" name="message" rows={3} className="input"
          defaultValue={`Olá, tenho interesse no ${vehicleName}. Ainda está disponível?`} />
      </div>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Enviando..." : mode ? "Pedir agendamento" : "Enviar mensagem"}
      </button>
    </form>
  );
}
