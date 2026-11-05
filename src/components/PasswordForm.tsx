"use client";
import { changePassword } from "@/app/actions/auth";
import { useFormAction } from "@/lib/use-form-action";
import { FieldError, FormMessage } from "./FormMessage";

export function PasswordForm() {
  const { state, onSubmit, pending } = useFormAction(changePassword);
  return (
    <form onSubmit={onSubmit} className="card max-w-md space-y-4 p-6">
      <div>
        <label className="label" htmlFor="current">Senha atual</label>
        <input id="current" name="current" type="password" required autoComplete="current-password" className="input" />
        <FieldError state={state} name="current" />
      </div>
      <div>
        <label className="label" htmlFor="password">Nova senha</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
        <FieldError state={state} name="password" />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Repita a nova senha</label>
        <input id="confirm" name="confirm" type="password" required autoComplete="new-password" className="input" />
        <FieldError state={state} name="confirm" />
      </div>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Salvando..." : "Alterar senha"}</button>
    </form>
  );
}
