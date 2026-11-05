"use client";
import { useState } from "react";
import { CheckCircle2, ChevronDown, Circle, MinusCircle, Plus } from "lucide-react";
import { deleteDocument, saveDocument } from "@/app/actions/management";
import { documentStatusLabels, documentTypeLabels } from "@/lib/labels";
import { useFormAction } from "@/lib/use-form-action";
import { FieldError, FormMessage } from "../FormMessage";
import { DeleteButton, FileInput, FileLink, useResetOnSuccess } from "./shared";

export type DocumentData = {
  id: string;
  type: keyof typeof documentTypeLabels;
  label: string | null;
  status: keyof typeof documentStatusLabels;
  expiresAt: string;
  expiresLabel: string | null;
  expired: boolean;
  notes: string | null;
  fileName: string | null;
  hasFile: boolean;
};

const statusStyle = {
  OK: { icon: CheckCircle2, cls: "text-emerald-600", chip: "bg-emerald-50 text-emerald-700" },
  PENDING: { icon: Circle, cls: "text-amber-500", chip: "bg-amber-50 text-amber-700" },
  NOT_APPLICABLE: { icon: MinusCircle, cls: "text-slate-400", chip: "bg-slate-100 text-slate-600" },
} as const;

function Fields({ doc, state }: { doc?: DocumentData; state: { fieldErrors?: Record<string, string> } }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label">Situação</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(documentStatusLabels).map(([k, v]) => (
            <label key={k} className="cursor-pointer">
              <input type="radio" name="status" value={k} defaultChecked={(doc?.status ?? "PENDING") === k} className="peer sr-only" />
              <span className="btn border border-slate-300 bg-white py-2 text-slate-600 peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700">{v}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Validade (se houver)</label>
        <input name="expiresAt" type="date" defaultValue={doc?.expiresAt ?? ""} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Observação</label>
        <input name="notes" defaultValue={doc?.notes ?? ""} className="input" placeholder="Ex.: original com o despachante" />
        <FieldError state={state} name="notes" />
      </div>
      <div className="sm:col-span-2">
        <FileInput label={doc?.hasFile ? "Substituir arquivo digitalizado" : "Anexar arquivo digitalizado (PDF ou foto)"} />
      </div>
    </div>
  );
}

export function DocumentRow({ vehicleId, doc }: { vehicleId: string; doc: DocumentData }) {
  const [open, setOpen] = useState(false);
  const { state, onSubmit, pending } = useFormAction(saveDocument);
  const st = statusStyle[doc.status];
  const title = doc.type === "OTHER" ? doc.label ?? "Outro" : documentTypeLabels[doc.type];
  return (
    <li className="rounded-xl border border-slate-200">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-left">
        <st.icon className={`h-6 w-6 shrink-0 ${st.cls}`} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-800">{title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className={`badge ${st.chip}`}>{documentStatusLabels[doc.status]}</span>
            {doc.expiresLabel && <span className={`badge ${doc.expired ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>Validade {doc.expiresLabel}</span>}
            {doc.hasFile && <span className="badge bg-brand-50 text-brand-700">Arquivo anexado</span>}
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <form onSubmit={onSubmit} className="space-y-4 border-t border-slate-100 p-4">
          <input type="hidden" name="vehicleId" value={vehicleId} />
          <input type="hidden" name="id" value={doc.id} />
          <input type="hidden" name="type" value={doc.type} />
          {doc.type === "OTHER" && <input type="hidden" name="label" value={doc.label ?? ""} />}
          {doc.hasFile && <FileLink href={`/painel/arquivo/documento/${doc.id}`} name={doc.fileName} />}
          <Fields doc={doc} state={state} />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</button>
            <DeleteButton onDelete={() => deleteDocument(doc.id)} confirmText="Remover este item da lista?" label="Remover item" />
            <FormMessage state={state} />
          </div>
        </form>
      )}
    </li>
  );
}

export function NewDocumentForm({ vehicleId }: { vehicleId: string }) {
  const [open, setOpen] = useState(false);
  const { state, onSubmit, pending } = useFormAction(saveDocument);
  const ref = useResetOnSuccess(state);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary">
        <Plus className="h-4 w-4" /> Adicionar documento
      </button>
    );
  }
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-4 rounded-xl bg-slate-50 p-4 sm:p-5">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="doc-type">Documento</label>
          <select id="doc-type" name="type" className="input" defaultValue="OTHER">
            {Object.entries(documentTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="doc-label">Nome (para “Outro”)</label>
          <input id="doc-label" name="label" className="input" placeholder="Ex.: Nota fiscal de compra" />
          <FieldError state={state} name="label" />
        </div>
      </div>
      <Fields state={state} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Salvando..." : "Adicionar"}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
