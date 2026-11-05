"use client";
import { useTransition } from "react";
import { Check, CheckCheck, Loader2, UserX, X } from "lucide-react";
import { setAppointmentStatus } from "@/app/actions/agenda";

export function AppointmentActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const set = (s: "SCHEDULED" | "DONE" | "NO_SHOW" | "CANCELED") => start(() => setAppointmentStatus(id, s));
  if (pending) return <Loader2 className="h-4 w-4 animate-spin text-slate-400" />;
  if (status === "REQUESTED") {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={() => set("SCHEDULED")}><Check className="h-3.5 w-3.5" /> Confirmar</button>
        <button type="button" className="btn-ghost px-3 py-1.5 text-xs text-red-600" onClick={() => confirm("Recusar este pedido?") && set("CANCELED")}><X className="h-3.5 w-3.5" /> Recusar</button>
      </div>
    );
  }
  if (status !== "SCHEDULED") return null;
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => set("DONE")}><CheckCheck className="h-3.5 w-3.5" /> Realizado</button>
      <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => set("NO_SHOW")}><UserX className="h-3.5 w-3.5" /> Não veio</button>
      <button type="button" className="btn-ghost px-3 py-1.5 text-xs text-red-600" onClick={() => confirm("Cancelar este agendamento?") && set("CANCELED")}><X className="h-3.5 w-3.5" /> Cancelar</button>
    </div>
  );
}
