"use client";
/* eslint-disable @next/next/no-img-element */
import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Car, Handshake, Plus, Repeat, Trash2, UserRound, Wallet } from "lucide-react";
import { saveSale } from "@/app/actions/sales";
import { initialState } from "@/lib/action-state";
import { paymentMethodLabels } from "@/lib/labels";
import { CustomerForm } from "./CustomerForm";
import { FormMessage } from "./FormMessage";

type Method = keyof typeof paymentMethodLabels;
export type SaleVehicleOption = { id: string; title: string; price: number; mileage: number; plate: string | null; thumb: string | null };
export type SaleCustomerOption = { id: string; name: string; document: string | null; phone: string | null };
type PaymentRow = { key: string; method: Method; amount: string; details: string; dueDate: string; paid: boolean };
export type SaleInitial = {
  id: string;
  vehicleId: string;
  customerId: string;
  status: "RESERVED" | "COMPLETED";
  date: string;
  price: number;
  mileageAtSale: number | null;
  warrantyDays: number;
  commission: number | null;
  notes: string;
  hasTradeIn: boolean;
  payments: Omit<PaymentRow, "key">[];
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const parse = (v: string) => {
  const n = Number(v.replace(/[^\d,]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const fmt = (v: number) => (v ? v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "");
let seq = 0;
const newRow = (p: Partial<PaymentRow> = {}): PaymentRow => ({ key: `p${++seq}`, method: "PIX", amount: "", details: "", dueDate: "", paid: true, ...p });
const PENDING_METHODS: Method[] = ["FINANCING", "PROMISSORY"];

function Block({ icon: Icon, title, children, aside }: { icon: typeof Car; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-semibold text-slate-900">
          <span className="icon-box h-8 w-8 bg-brand-50 text-brand-600"><Icon className="h-4 w-4" /></span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function SaleForm({
  vehicles,
  customers: initialCustomers,
  initial,
  presetVehicleId,
  presetCustomerId,
  isOwner,
  today,
}: {
  vehicles: SaleVehicleOption[];
  customers: SaleCustomerOption[];
  initial?: SaleInitial;
  presetVehicleId?: string;
  presetCustomerId?: string;
  isOwner: boolean;
  today: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveSale, initialState);
  const [customers, setCustomers] = useState(initialCustomers);
  const [vehicleId, setVehicleId] = useState(initial?.vehicleId ?? presetVehicleId ?? "");
  const [customerId, setCustomerId] = useState(initial?.customerId ?? presetCustomerId ?? "");
  const [customerQuery, setCustomerQuery] = useState("");
  const [newCustomer, setNewCustomer] = useState(false);
  const [status, setStatus] = useState<"RESERVED" | "COMPLETED">(initial?.status ?? "COMPLETED");
  const [date, setDate] = useState(initial?.date ?? today);
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const [price, setPrice] = useState(initial ? fmt(initial.price) : vehicle ? fmt(vehicle.price) : "");
  const [mileage, setMileage] = useState(initial?.mileageAtSale != null ? String(initial.mileageAtSale) : vehicle ? String(vehicle.mileage) : "");
  const [warrantyDays, setWarrantyDays] = useState(String(initial?.warrantyDays ?? 90));
  const [commission, setCommission] = useState(initial?.commission ? fmt(initial.commission) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [payments, setPayments] = useState<PaymentRow[]>(initial ? initial.payments.map((p) => newRow(p)) : [newRow()]);
  const [tradeIn, setTradeIn] = useState({ type: "CAR", brand: "", model: "", version: "", yearManufacture: "", yearModel: "", plate: "", color: "", mileage: "" });

  useEffect(() => {
    if (state.id && !state.error) router.push(`/painel/vendas/${state.id}?salvo=1`);
  }, [state, router]);

  const total = parse(price);
  const paid = payments.reduce((s, p) => s + parse(p.amount), 0);
  const diff = Math.round((total - paid) * 100) / 100;
  const needsTradeIn = payments.some((p) => p.method === "TRADE_IN") && !initial?.hasTradeIn;
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return (q ? customers.filter((c) => c.name.toLowerCase().includes(q) || (digits.length > 2 && ((c.document ?? "").includes(digits) || (c.phone ?? "").includes(digits)))) : customers).slice(0, 8);
  }, [customers, customerQuery]);

  const update = (key: string, patch: Partial<PaymentRow>) => setPayments((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  function submit() {
    const fd = new FormData();
    if (initial) fd.set("id", initial.id);
    fd.set("vehicleId", vehicleId);
    fd.set("customerId", customerId);
    fd.set("status", status);
    fd.set("date", date);
    fd.set("price", price);
    fd.set("mileageAtSale", mileage);
    fd.set("warrantyDays", warrantyDays || "0");
    if (isOwner) fd.set("commission", commission);
    fd.set("notes", notes);
    fd.set("payments", JSON.stringify(payments.map(({ method, amount, details, dueDate, paid }) => ({ method, amount, details, dueDate, paid }))));
    if (needsTradeIn) fd.set("tradeIn", JSON.stringify(tradeIn));
    startTransition(() => action(fd));
  }

  return (
    <div className="space-y-8">
      {/* Tipo */}
      <div className="grid grid-cols-2 gap-3">
        {([
          ["COMPLETED", Handshake, "Venda", "Negócio fechado: gera contrato, recibo e garantia."],
          ["RESERVED", CalendarCheck, "Reserva com sinal", "Cliente pagou o sinal: gera recibo de sinal."],
        ] as const).map(([k, Icon, label, text]) => (
          <button key={k} type="button" onClick={() => setStatus(k)}
            className={`card flex flex-col items-start gap-2 p-4 text-left transition sm:p-5 ${status === k ? "border-brand-500 ring-4 ring-brand-100" : "hover:border-slate-300"}`}>
            <Icon className={`h-6 w-6 ${status === k ? "text-brand-600" : "text-slate-400"}`} />
            <span className="font-semibold text-slate-900">{label}</span>
            <span className="hidden text-xs text-slate-500 sm:block">{text}</span>
          </button>
        ))}
      </div>

      <Block icon={Car} title="Veículo">
        {initial ? (
          <p className="font-medium text-slate-800">{vehicle?.title ?? "Veículo da venda"}</p>
        ) : (
          <div className="space-y-3">
            <select className="input" value={vehicleId} onChange={(e) => {
              const v = vehicles.find((x) => x.id === e.target.value);
              setVehicleId(e.target.value);
              if (v) { setPrice(fmt(v.price)); setMileage(String(v.mileage)); }
            }}>
              <option value="">Escolha o veículo</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.title}{v.plate ? ` · ${v.plate}` : ""} · {brl(v.price)}</option>)}
            </select>
            {vehicle && (
              <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-3">
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-200">{vehicle.thumb && <img src={vehicle.thumb} alt="" className="h-full w-full object-cover" />}</div>
                <div className="text-sm"><p className="font-medium text-slate-800">{vehicle.title}</p><p className="text-slate-500">Anunciado por {brl(vehicle.price)}</p></div>
              </div>
            )}
          </div>
        )}
      </Block>

      <Block icon={UserRound} title="Cliente" aside={!newCustomer && <button type="button" className="btn-ghost" onClick={() => setNewCustomer(true)}><Plus className="h-4 w-4" /> Novo</button>}>
        {newCustomer ? (
          <div className="space-y-4">
            <CustomerForm compact submitLabel="Cadastrar e usar" onSaved={(id, name) => {
              setCustomers((cs) => [{ id, name, document: null, phone: null }, ...cs]);
              setCustomerId(id);
              setNewCustomer(false);
            }} />
            <button type="button" className="btn-ghost" onClick={() => setNewCustomer(false)}>Cancelar</button>
          </div>
        ) : selectedCustomer ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
            <div><p className="font-medium text-slate-800">{selectedCustomer.name}</p><p className="text-sm text-slate-500">{selectedCustomer.phone ?? ""}</p></div>
            <button type="button" className="btn-ghost" onClick={() => setCustomerId("")}>Trocar</button>
          </div>
        ) : (
          <div className="space-y-3">
            <input className="input" placeholder="Buscar cliente por nome, CPF ou telefone" value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} />
            {filteredCustomers.length > 0 ? (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {filteredCustomers.map((c) => (
                  <li key={c.id}><button type="button" onClick={() => setCustomerId(c.id)} className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50"><span className="font-medium text-slate-800">{c.name}</span> <span className="text-slate-500">{c.phone ?? ""}</span></button></li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Nenhum cliente encontrado. Use “Novo” para cadastrar.</p>
            )}
          </div>
        )}
      </Block>

      <Block icon={Wallet} title="Valores e pagamento">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="s-price">Valor da venda (R$)</label>
            <input id="s-price" className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="s-date">Data</label>
            <input id="s-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="s-km">Km na entrega</label>
            <input id="s-km" className="input" inputMode="numeric" value={mileage} onChange={(e) => setMileage(e.target.value)} />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-sm font-semibold text-slate-700">{status === "RESERVED" ? "Sinal recebido" : "Formas de pagamento"}</p>
          {payments.map((p) => (
            <div key={p.key} className="space-y-3 rounded-xl border border-slate-200 p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.2fr_1fr_auto]">
                <select className="input col-span-2 sm:col-span-1" value={p.method} onChange={(e) => {
                  const m = e.target.value as Method;
                  update(p.key, { method: m, paid: !PENDING_METHODS.includes(m) });
                }} aria-label="Forma de pagamento">
                  {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input className="input" inputMode="decimal" placeholder="Valor" value={p.amount} onChange={(e) => update(p.key, { amount: e.target.value })} aria-label="Valor" />
                <button type="button" className="btn-ghost justify-self-end px-3 text-red-600 hover:bg-red-50" onClick={() => setPayments((ps) => ps.filter((x) => x.key !== p.key))} disabled={payments.length === 1} aria-label="Remover pagamento">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr]">
                <input className="input" placeholder={p.method === "FINANCING" ? "Banco e nº de parcelas" : p.method === "PROMISSORY" ? "Ex.: 10x de R$ 1.000" : "Detalhes (opcional)"} value={p.details} onChange={(e) => update(p.key, { details: e.target.value })} aria-label="Detalhes" />
                {PENDING_METHODS.includes(p.method) && (
                  <input className="input" type="date" value={p.dueDate} onChange={(e) => update(p.key, { dueDate: e.target.value })} aria-label="Vencimento" />
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" className="h-4 w-4" checked={p.paid} onChange={(e) => update(p.key, { paid: e.target.checked })} /> Já recebido
              </label>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" className="btn-secondary" onClick={() => setPayments((ps) => [...ps, newRow({ amount: diff > 0 ? fmt(diff) : "" })])}>
              <Plus className="h-4 w-4" /> Adicionar forma de pagamento
            </button>
            <p className={`text-sm font-medium ${status === "COMPLETED" && diff !== 0 ? "text-amber-700" : "text-slate-600"}`}>
              Pagamentos {brl(paid)} de {brl(total)}{diff > 0 ? ` · faltam ${brl(diff)}` : diff < 0 ? ` · excede ${brl(-diff)}` : " · fechado ✓"}
            </p>
          </div>
        </div>
      </Block>

      {needsTradeIn && (
        <Block icon={Repeat} title="Veículo recebido na troca">
          <p className="mb-5 text-sm text-slate-500">Ele entra automaticamente no estoque como “Em preparação”, com o valor da troca como custo de compra.</p>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <select className="input" value={tradeIn.type} onChange={(e) => setTradeIn({ ...tradeIn, type: e.target.value })} aria-label="Tipo">
              <option value="CAR">Carro</option><option value="MOTORCYCLE">Moto</option><option value="TRUCK">Caminhão</option><option value="OTHER">Outro</option>
            </select>
            {([
              ["brand", "Marca"], ["model", "Modelo"], ["version", "Versão"], ["yearManufacture", "Ano fab."], ["yearModel", "Ano modelo"], ["plate", "Placa"], ["color", "Cor"], ["mileage", "Km"],
            ] as const).map(([k, label]) => (
              <input key={k} className="input" placeholder={label} aria-label={label} value={tradeIn[k]} onChange={(e) => setTradeIn({ ...tradeIn, [k]: e.target.value })}
                inputMode={["yearManufacture", "yearModel", "mileage"].includes(k) ? "numeric" : undefined} />
            ))}
          </div>
        </Block>
      )}

      <Block icon={Handshake} title="Condições">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="s-warranty">Garantia (dias)</label>
            <input id="s-warranty" className="input" inputMode="numeric" value={warrantyDays} onChange={(e) => setWarrantyDays(e.target.value.replace(/\D/g, ""))} />
            <p className="mt-1 text-xs text-slate-500">Motor e câmbio. 0 = sem termo de garantia.</p>
          </div>
          {isOwner && (
            <div>
              <label className="label" htmlFor="s-commission">Comissão do vendedor (R$)</label>
              <input id="s-commission" className="input" inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} />
            </div>
          )}
        </div>
        <div className="mt-5">
          <label className="label" htmlFor="s-notes">Condições adicionais (saem no contrato e no recibo de sinal)</label>
          <textarea id="s-notes" className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: loja entrega o veículo com revisão feita e tanque cheio." />
        </div>
      </Block>

      <div className="sticky bottom-[92px] z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center lg:bottom-4">
        <button type="button" className="btn-primary" onClick={submit} disabled={pending || !vehicleId || !customerId}>
          {pending ? "Salvando..." : initial ? "Salvar alterações" : status === "RESERVED" ? "Registrar reserva" : "Registrar venda"}
        </button>
        {(!vehicleId || !customerId) && <span className="text-xs text-slate-500">Escolha o veículo e o cliente.</span>}
        <div className="flex-1"><FormMessage state={state.id ? {} : state} /></div>
      </div>
    </div>
  );
}
