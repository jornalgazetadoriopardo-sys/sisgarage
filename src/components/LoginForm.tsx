"use client";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { initialState } from "@/lib/action-state";
import { FieldError, FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, initialState);
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        <FieldError state={state} name="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full" pendingText="Entrando...">Entrar</SubmitButton>
    </form>
  );
}
