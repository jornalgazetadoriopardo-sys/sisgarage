"use client";
import { signupStore } from "@/app/actions/auth";
import { useFormAction } from "@/lib/use-form-action";
import { BR_STATES } from "@/lib/labels";
import { FieldError, FormMessage } from "./FormMessage";

export function SignupForm() {
  const { state, onSubmit, pending } = useFormAction(signupStore);
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Dados da loja</legend>
        <div>
          <label className="label" htmlFor="storeName">Nome da loja</label>
          <input id="storeName" name="storeName" required className="input" />
          <FieldError state={state} name="storeName" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cnpj">CNPJ (opcional)</label>
            <input id="cnpj" name="cnpj" inputMode="numeric" className="input" placeholder="00.000.000/0000-00" />
            <FieldError state={state} name="cnpj" />
          </div>
          <div>
            <label className="label" htmlFor="phone">WhatsApp da loja</label>
            <input id="phone" name="phone" required inputMode="tel" className="input" placeholder="(51) 99999-9999" />
            <FieldError state={state} name="phone" />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_100px] gap-4">
          <div>
            <label className="label" htmlFor="city">Cidade</label>
            <input id="city" name="city" required className="input" />
            <FieldError state={state} name="city" />
          </div>
          <div>
            <label className="label" htmlFor="state">UF</label>
            <select id="state" name="state" required className="input" defaultValue="">
              <option value="" disabled>--</option>
              {BR_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <FieldError state={state} name="state" />
          </div>
        </div>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Seu acesso</legend>
        <div>
          <label className="label" htmlFor="name">Seu nome</label>
          <input id="name" name="name" required autoComplete="name" className="input" />
          <FieldError state={state} name="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          <FieldError state={state} name="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha (mín. 8 caracteres)</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
          <FieldError state={state} name="password" />
        </div>
      </fieldset>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary w-full py-3" disabled={pending}>
        {pending ? "Cadastrando..." : "Cadastrar loja"}
      </button>
      <p className="text-center text-xs text-slate-500">
        Após o cadastro, sua loja passa por aprovação antes de aparecer no site. Você já pode cadastrar o estoque.
      </p>
    </form>
  );
}
