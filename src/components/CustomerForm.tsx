"use client";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { saveCustomer } from "@/app/actions/customers";
import { BR_STATES } from "@/lib/labels";
import { useFormAction } from "@/lib/use-form-action";
import { FieldError, FormMessage } from "./FormMessage";

export type CustomerData = {
  id?: string;
  name?: string;
  document?: string | null;
  rg?: string | null;
  birthDate?: string;
  phone?: string | null;
  email?: string | null;
  zipCode?: string | null;
  address?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
};

/** Cadastro de cliente. Com CEP preenchido, busca o endereço automaticamente (ViaCEP). */
export function CustomerForm({
  customer = {},
  compact,
  onSaved,
  submitLabel = "Salvar cliente",
}: {
  customer?: CustomerData;
  compact?: boolean;
  onSaved?: (id: string, name: string) => void;
  submitLabel?: string;
}) {
  const { state, onSubmit, pending } = useFormAction(saveCustomer);
  const [addr, setAddr] = useState({ address: customer.address ?? "", district: customer.district ?? "", city: customer.city ?? "", state: customer.state ?? "" });
  const [name, setName] = useState(customer.name ?? "");
  const [cepMsg, setCepMsg] = useState<string | null>(null);

  useEffect(() => {
    if (state.id && state.message && onSaved) onSaved(state.id, name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function lookupCep(value: string) {
    const cep = value.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepMsg("Buscando endereço...");
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then((x) => x.json());
      if (r.erro) return setCepMsg("CEP não encontrado.");
      setAddr((a) => ({ address: r.logradouro ? `${r.logradouro}, ` : a.address, district: r.bairro || a.district, city: r.localidade || a.city, state: r.uf || a.state }));
      setCepMsg(null);
    } catch {
      setCepMsg("Não foi possível buscar o CEP. Preencha manualmente.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {customer.id && <input type="hidden" name="id" value={customer.id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="c-name">Nome completo *</label>
          <input id="c-name" name="name" required value={name} onChange={(e) => setName(e.target.value)} className="input" autoComplete="off" />
          <FieldError state={state} name="name" />
        </div>
        <div>
          <label className="label" htmlFor="c-document">CPF ou CNPJ</label>
          <input id="c-document" name="document" defaultValue={customer.document ?? ""} inputMode="numeric" className="input" placeholder="Necessário para contrato" />
          <FieldError state={state} name="document" />
        </div>
        <div>
          <label className="label" htmlFor="c-phone">Telefone / WhatsApp</label>
          <input id="c-phone" name="phone" defaultValue={customer.phone ?? ""} inputMode="tel" className="input" />
        </div>
        {!compact && (
          <>
            <div>
              <label className="label" htmlFor="c-rg">RG</label>
              <input id="c-rg" name="rg" defaultValue={customer.rg ?? ""} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="c-birth">Data de nascimento</label>
              <input id="c-birth" name="birthDate" type="date" defaultValue={customer.birthDate ?? ""} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="c-email">E-mail</label>
              <input id="c-email" name="email" type="email" defaultValue={customer.email ?? ""} className="input" />
              <FieldError state={state} name="email" />
            </div>
          </>
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
        <div>
          <label className="label" htmlFor="c-zip">CEP</label>
          <div className="relative">
            <input id="c-zip" name="zipCode" defaultValue={customer.zipCode ?? ""} inputMode="numeric" className="input pr-9" onBlur={(e) => lookupCep(e.target.value)} />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          <FieldError state={state} name="zipCode" />
        </div>
        <div>
          <label className="label" htmlFor="c-address">Endereço e número</label>
          <input id="c-address" name="address" value={addr.address} onChange={(e) => setAddr({ ...addr, address: e.target.value })} className="input" />
        </div>
      </div>
      {cepMsg && <p className="text-xs text-slate-500">{cepMsg}</p>}
      <div className="grid gap-5 sm:grid-cols-[1fr_1fr_100px]">
        <div>
          <label className="label" htmlFor="c-district">Bairro</label>
          <input id="c-district" name="district" value={addr.district} onChange={(e) => setAddr({ ...addr, district: e.target.value })} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="c-city">Cidade</label>
          <input id="c-city" name="city" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="c-state">UF</label>
          <select id="c-state" name="state" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} className="input">
            <option value="">--</option>
            {BR_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {!compact && (
        <div>
          <label className="label" htmlFor="c-notes">Observações</label>
          <textarea id="c-notes" name="notes" rows={3} defaultValue={customer.notes ?? ""} className="input" />
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Salvando..." : submitLabel}</button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
