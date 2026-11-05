"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { saveAppointment } from "@/app/actions/agenda";
import { appointmentTypeLabels } from "@/lib/labels";
import { useFormAction } from "@/lib/use-form-action";
import { FieldError, FormMessage } from "../FormMessage";

type Opt = { id: string; label: string };
export type AppointmentFormValues = {
  id?: string;
  type?: string;
  day?: string;
  time?: string;
  durationMin?: number;
  title?: string | null;
  vehicleId?: string | null;
  customerId?: string | null;
  leadId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  assignedToId?: string | null;
  notes?: string | null;
};

export function AppointmentForm({
  values = {},
  vehicles,
  customers,
  users,
  defaultDay,
  startOpen,
  doneHref,
}: {
  values?: AppointmentFormValues;
  vehicles: Opt[];
  customers: Opt[];
  users: Opt[];
  defaultDay: string;
  startOpen?: boolean;
  doneHref?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(startOpen || values.id));
  const { state, onSubmit, pending } = useFormAction(saveAppointment);
  useEffect(() => {
    if (state.message && !state.error) {
      setOpen(false);
      if (doneHref) router.push(doneHref);
    }
  }, [state, doneHref, router]);

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Novo agendamento</button>
        <FormMessage state={state} />
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-5 sm:p-6">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {values.leadId && <input type="hidden" name="leadId" value={values.leadId} />}
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="a-type">Tipo</label>
          <select id="a-type" name="type" defaultValue={values.type ?? "TEST_DRIVE"} className="input">
            {Object.entries(appointmentTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="a-day">Dia</label>
          <input id="a-day" name="day" type="date" required defaultValue={values.day ?? defaultDay} className="input" />
          <FieldError state={state} name="day" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="a-time">Horário</label>
            <input id="a-time" name="time" type="time" required defaultValue={values.time ?? "10:00"} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="a-dur">Duração</label>
            <select id="a-dur" name="durationMin" defaultValue={String(values.durationMin ?? 60)} className="input">
              {[15, 30, 45, 60, 90, 120, 180].map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60}h`.replace(".5", "h30")}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="a-vehicle">Veículo</label>
          <select id="a-vehicle" name="vehicleId" defaultValue={values.vehicleId ?? ""} className="input">
            <option value="">—</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="a-customer">Cliente cadastrado</label>
          <select id="a-customer" name="customerId" defaultValue={values.customerId ?? ""} className="input">
            <option value="">— (ou preencha abaixo)</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="a-name">Nome do contato</label>
          <input id="a-name" name="contactName" defaultValue={values.contactName ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="a-phone">Telefone</label>
          <input id="a-phone" name="contactPhone" defaultValue={values.contactPhone ?? ""} inputMode="tel" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="a-user">Responsável</label>
          <select id="a-user" name="assignedToId" defaultValue={values.assignedToId ?? ""} className="input">
            <option value="">—</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="a-title">Título (opcional)</label>
          <input id="a-title" name="title" defaultValue={values.title ?? ""} className="input" placeholder="Ex.: Levar ao despachante para transferência" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="a-notes">Observações</label>
        <textarea id="a-notes" name="notes" rows={2} defaultValue={values.notes ?? ""} className="input" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Salvando..." : values.id ? "Salvar e confirmar" : "Agendar"}</button>
        <button type="button" className="btn-ghost" onClick={() => (doneHref ? router.push(doneHref) : setOpen(false))}>Fechar</button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
