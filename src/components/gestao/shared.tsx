"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { FileText, Loader2, Paperclip, Trash2 } from "lucide-react";

export function FileLink({ href, name }: { href: string; name: string | null }) {
  return (
    <a href={href} target="_blank" rel="noopener" className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">
      <FileText className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{name ?? "Arquivo"}</span>
    </a>
  );
}

export function FileInput({ label = "Anexar comprovante (PDF ou foto)" }: { label?: string }) {
  const [name, setName] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <button type="button" onClick={() => ref.current?.click()} className="btn-secondary w-full justify-start font-normal text-slate-600">
        <Paperclip className="h-4 w-4" />
        <span className="truncate">{name ?? label}</span>
      </button>
      <input ref={ref} name="file" type="file" accept="application/pdf,image/*" hidden onChange={(e) => setName(e.target.files?.[0]?.name ?? null)} />
    </div>
  );
}

export function DeleteButton({ onDelete, confirmText, label = "Excluir" }: { onDelete: () => Promise<void>; confirmText: string; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => confirm(confirmText) && start(onDelete)}
      className="btn-ghost px-2.5 py-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
      aria-label={label}
      title={label}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}

/** Limpa o formulário depois de salvar com sucesso. */
export function useResetOnSuccess(state: { message?: string; error?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.message && !state.error) ref.current?.reset();
  }, [state]);
  return ref;
}
