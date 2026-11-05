"use client";
import { useTransition } from "react";
import { moveLead } from "@/app/actions/crm";
import { leadStatusLabels } from "@/lib/labels";

/** Muda a etapa rapidamente direto no quadro (perdido exige motivo, na ficha). */
export function LeadStage({ id, status }: { id: string; status: keyof typeof leadStatusLabels }) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Etapa"
      disabled={pending}
      value={status}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const v = e.target.value as keyof typeof leadStatusLabels;
        if (v === "LOST") {
          window.location.href = `/painel/contatos/${id}?perdido=1`;
          return;
        }
        start(() => moveLead(id, v));
      }}
      className="w-full cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-7 text-xs font-medium text-slate-600"
    >
      {Object.entries(leadStatusLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
    </select>
  );
}
