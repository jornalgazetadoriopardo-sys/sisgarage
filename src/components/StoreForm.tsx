"use client";
/* eslint-disable @next/next/no-img-element */
import type { Store } from "@prisma/client";
import { updateStore } from "@/app/actions/store";
import { BR_STATES } from "@/lib/labels";
import { useFormAction } from "@/lib/use-form-action";
import { FieldError, FormMessage } from "./FormMessage";

export function StoreForm({ store }: { store: Store }) {
  const { state, onSubmit, pending } = useFormAction(updateStore);
  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-5 sm:p-6">
      <div className="flex items-center gap-4">
        {store.logoUrl ? (
          <img src={store.logoUrl} alt="Logo" className="h-16 w-16 rounded-xl object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-600 text-2xl font-bold text-white">{store.name[0]}</div>
        )}
        <div className="flex-1">
          <label className="label" htmlFor="logo">Logo</label>
          <input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" className="input" />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Nome da loja</label>
          <input id="name" name="name" required defaultValue={store.name} className="input" />
          <FieldError state={state} name="name" />
        </div>
        <div>
          <label className="label" htmlFor="legalName">Razão social (sai nos contratos)</label>
          <input id="legalName" name="legalName" defaultValue={store.legalName ?? ""} className="input" placeholder="Ex.: Garagem Demo Comércio de Veículos Ltda" />
        </div>
        <div>
          <label className="label" htmlFor="cnpj">CNPJ</label>
          <input id="cnpj" name="cnpj" defaultValue={store.cnpj ?? ""} inputMode="numeric" className="input" />
          <FieldError state={state} name="cnpj" />
        </div>
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required defaultValue={store.email} className="input" />
          <FieldError state={state} name="email" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Telefone</label>
          <input id="phone" name="phone" defaultValue={store.phone ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="whatsapp">WhatsApp (recebe os contatos)</label>
          <input id="whatsapp" name="whatsapp" defaultValue={store.whatsapp ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="instagram">Instagram</label>
          <input id="instagram" name="instagram" defaultValue={store.instagram ? `@${store.instagram}` : ""} className="input" placeholder="@sualoja" />
        </div>
        <div>
          <label className="label" htmlFor="brandColor">Cor da loja (posts e documentos)</label>
          <div className="flex items-center gap-3">
            <input id="brandColor" name="brandColor" type="color" defaultValue={store.brandColor ?? "#1d55d8"} className="h-11 w-16 cursor-pointer rounded-lg border border-slate-300 bg-white p-1" />
            <span className="text-xs text-slate-500">Usada no fundo e nos destaques dos posts.</span>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="openingHours">Horário de atendimento</label>
          <input id="openingHours" name="openingHours" defaultValue={store.openingHours ?? ""} className="input" placeholder="Seg a sex 8h–18h · Sáb 8h–12h" />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
        <div>
          <label className="label" htmlFor="zipCode">CEP</label>
          <input id="zipCode" name="zipCode" defaultValue={store.zipCode ?? ""} className="input" />
          <FieldError state={state} name="zipCode" />
        </div>
        <div>
          <label className="label" htmlFor="address">Endereço</label>
          <input id="address" name="address" defaultValue={store.address ?? ""} className="input" placeholder="Rua, número, bairro" />
        </div>
      </div>
      <div className="grid grid-cols-[1fr_100px] gap-4">
        <div>
          <label className="label" htmlFor="city">Cidade</label>
          <input id="city" name="city" required defaultValue={store.city} className="input" />
          <FieldError state={state} name="city" />
        </div>
        <div>
          <label className="label" htmlFor="state">UF</label>
          <select id="state" name="state" defaultValue={store.state} className="input">
            {BR_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Sobre a loja</label>
        <textarea id="description" name="description" rows={4} defaultValue={store.description ?? ""} className="input" />
      </div>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</button>
    </form>
  );
}
