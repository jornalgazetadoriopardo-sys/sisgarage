"use client";
import { useEffect, useRef } from "react";
import { addLeadNote, createLead, updateLead } from "@/app/actions/crm";
import { leadSourceLabels, leadStatusLabels } from "@/lib/labels";
import { useFormAction } from "@/lib/use-form-action";
import { FieldError, FormMessage } from "../FormMessage";

export function NewLeadForm({ vehicles }: { vehicles: { id: string; label: string }[] }) {
  const { state, onSubmit, pending } = useFormAction(createLead);
  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="l-name">Nome</label>
          <input id="l-name" name="name" required className="input" />
          <FieldError state={state} name="name" />
        </div>
        <div>
          <label className="label" htmlFor="l-phone">Telefone / WhatsApp</label>
          <input id="l-phone" name="phone" required inputMode="tel" className="input" />
          <FieldError state={state} name="phone" />
        </div>
        <div>
          <label className="label" htmlFor="l-source">Como chegou</label>
          <select id="l-source" name="source" defaultValue="WHATSAPP" className="input">
            {Object.entries(leadSourceLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="l-vehicle">Interesse em</label>
          <select id="l-vehicle" name="vehicleId" className="input" defaultValue="">
            <option value="">—</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="l-follow">Retornar em</label>
          <input id="l-follow" name="nextFollowUp" type="date" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="l-email">E-mail</label>
          <input id="l-email" name="email" type="email" className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="l-message">O que a pessoa procura</label>
        <textarea id="l-message" name="message" rows={3} className="input" placeholder="Ex.: SUV até R$ 90 mil, tem um Gol 2015 para dar na troca" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Salvando..." : "Salvar contato"}</button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function LeadStatusForm({
  id, status, nextFollowUp, assignedToId, lostReason, users, focusLost,
}: {
  id: string; status: keyof typeof leadStatusLabels; nextFollowUp: string; assignedToId: string; lostReason: string;
  users: { id: string; label: string }[]; focusLost?: boolean;
}) {
  const { state, onSubmit, pending } = useFormAction(updateLead);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" name="id" value={id} />
      <div>
        <span className="label">Etapa</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(leadStatusLabels).map(([k, v]) => (
            <label key={k} className="cursor-pointer">
              <input type="radio" name="status" value={k} defaultChecked={(focusLost ? "LOST" : status) === k} className="peer sr-only" />
              <span className="btn border border-slate-300 bg-white py-2 text-slate-600 peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700">{v}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="s-follow">Retornar em</label>
          <input id="s-follow" name="nextFollowUp" type="date" defaultValue={nextFollowUp} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="s-user">Responsável</label>
          <select id="s-user" name="assignedToId" defaultValue={assignedToId} className="input">
            <option value="">—</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="s-lost">Motivo (se perdido)</label>
          <input id="s-lost" name="lostReason" defaultValue={lostReason} autoFocus={focusLost} className="input" placeholder="Comprou em outra loja, sem crédito..." />
          <FieldError state={state} name="lostReason" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Salvando..." : "Atualizar"}</button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function NoteForm({ id }: { id: string }) {
  const { state, onSubmit, pending } = useFormAction(addLeadNote);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.message) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <textarea name="text" rows={3} className="input" placeholder="O que foi conversado? Ex.: mandei fotos, vai trazer o carro da troca sábado" />
      <FieldError state={state} name="text" />
      <button type="submit" className="btn-secondary" disabled={pending}>{pending ? "Salvando..." : "Adicionar ao histórico"}</button>
    </form>
  );
}
