"use client";
import { createStaffUser } from "@/app/actions/store";
import { useFormAction } from "@/lib/use-form-action";
import { FieldError, FormMessage } from "./FormMessage";

export function StaffForm() {
  const { state, onSubmit, pending } = useFormAction(createStaffUser);
  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Adicionar funcionário</h2>
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="staff-name">Nome</label>
          <input id="staff-name" name="name" required className="input" />
          <FieldError state={state} name="name" />
        </div>
        <div>
          <label className="label" htmlFor="staff-email">E-mail</label>
          <input id="staff-email" name="email" type="email" required className="input" />
          <FieldError state={state} name="email" />
        </div>
        <div>
          <label className="label" htmlFor="staff-password">Senha inicial</label>
          <input id="staff-password" name="password" type="text" required minLength={8} className="input" autoComplete="off" />
          <FieldError state={state} name="password" />
        </div>
      </div>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Criando..." : "Criar usuário"}</button>
    </form>
  );
}
