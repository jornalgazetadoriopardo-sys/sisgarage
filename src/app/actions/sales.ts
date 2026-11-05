"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canSeeFinance, requireStoreUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { isValidPlate, normalizePlate, onlyDigits, parseMoney } from "@/lib/format";
import { zodErrors, type ActionState } from "@/lib/action-state";

const METHODS = ["PIX", "CASH", "TRANSFER", "DEBIT_CARD", "CREDIT_CARD", "FINANCING", "TRADE_IN", "PROMISSORY", "OTHER"] as const;
const cents = (n: number) => Math.round(n * 100);

const money = (msg: string) =>
  z.union([z.string(), z.number()]).transform((v) => (typeof v === "number" ? v : parseMoney(v))).refine((n) => Number.isFinite(n) && n >= 0, msg);
const day = (msg: string) =>
  z.string().min(1, msg).transform((v) => new Date(`${v}T00:00:00Z`)).refine((d) => !Number.isNaN(d.getTime()), msg);
const optDay = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(`${v}T00:00:00Z`) : null));

const paymentSchema = z.object({
  method: z.enum(METHODS),
  amount: money("Valor inválido").refine((n) => n > 0, "Valor deve ser maior que zero"),
  details: z.string().trim().max(200).optional().transform((v) => v || null),
  dueDate: optDay,
  paid: z.boolean().optional(),
});

const tradeInSchema = z.object({
  type: z.enum(["CAR", "MOTORCYCLE", "TRUCK", "OTHER"]).default("CAR"),
  brand: z.string().trim().min(1, "Marca do veículo da troca").max(60),
  model: z.string().trim().min(1, "Modelo do veículo da troca").max(80),
  version: z.string().trim().max(140).optional().transform((v) => v || null),
  yearManufacture: z.coerce.number().int().min(1950, "Ano inválido").max(new Date().getFullYear() + 1),
  yearModel: z.coerce.number().int().min(1950, "Ano inválido").max(new Date().getFullYear() + 2),
  plate: z
    .string()
    .optional()
    .transform((v) => (v ? normalizePlate(v) : ""))
    .refine((v) => v === "" || isValidPlate(v), "Placa da troca inválida")
    .transform((v) => v || null),
  color: z.string().trim().max(40).optional().transform((v) => v || null),
  mileage: z.union([z.string(), z.number()]).optional().transform((v) => Number(onlyDigits(String(v ?? "")) || 0)),
});

const saleSchema = z.object({
  id: z.string().optional(),
  vehicleId: z.string().min(1, "Escolha o veículo"),
  customerId: z.string().min(1, "Escolha ou cadastre o cliente"),
  status: z.enum(["RESERVED", "COMPLETED"]),
  date: day("Informe a data"),
  price: money("Informe o valor da venda").refine((n) => n > 0, "Informe o valor da venda"),
  commission: z.string().optional().transform((v) => (v ? parseMoney(v) : null)),
  warrantyDays: z.coerce.number().int().min(0).max(3650),
  mileageAtSale: z.string().optional().transform((v) => (v ? Number(onlyDigits(v)) : null)),
  notes: z.string().trim().max(4000).optional().transform((v) => v || null),
  payments: z
    .string()
    .transform((v, c) => {
      try {
        return JSON.parse(v) as unknown;
      } catch {
        c.addIssue({ code: "custom", message: "Pagamentos inválidos" });
        return z.NEVER;
      }
    })
    .pipe(z.array(paymentSchema).min(1, "Informe ao menos um pagamento").max(20)),
  tradeIn: z
    .string()
    .optional()
    .transform((v) => (v ? (JSON.parse(v) as unknown) : null))
    .pipe(tradeInSchema.nullable()),
});

export async function saveSale(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStoreUser();
  const parsed = saleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;

  const paid = d.payments.reduce((s, p) => s + cents(p.amount), 0);
  if (d.status === "COMPLETED" && paid !== cents(d.price)) {
    return { error: `A soma dos pagamentos (${(paid / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) precisa ser igual ao valor da venda.` };
  }
  if (d.status === "RESERVED" && paid > cents(d.price)) return { error: "O sinal não pode ser maior que o valor da venda." };
  const hasTradeIn = d.payments.some((p) => p.method === "TRADE_IN");

  const [vehicle, customer, existing] = await Promise.all([
    prisma.vehicle.findFirst({ where: { id: d.vehicleId, storeId: ctx.storeId } }),
    prisma.customer.findFirst({ where: { id: d.customerId, storeId: ctx.storeId } }),
    d.id ? prisma.sale.findFirst({ where: { id: d.id, storeId: ctx.storeId } }) : null,
  ]);
  if (!vehicle) return { error: "Veículo não encontrado." };
  if (!customer) return { error: "Cliente não encontrado." };
  if (d.id && (!existing || existing.status === "CANCELED")) return { error: "Venda não encontrada ou cancelada." };
  if (hasTradeIn && !d.tradeIn && !existing?.tradeInVehicleId) return { error: "Preencha os dados do veículo recebido na troca." };

  const active = await prisma.sale.findFirst({
    where: { vehicleId: vehicle.id, status: { not: "CANCELED" }, ...(d.id ? { NOT: { id: d.id } } : {}) },
    select: { number: true },
  });
  if (active) return { error: `Este veículo já tem a venda nº ${active.number}. Cancele-a antes de registrar outra.` };

  // Comissão: só o dono define; vendedor mantém o valor existente
  const commission = canSeeFinance(ctx) ? d.commission : existing?.commission ?? null;
  const tradeInPayment = d.payments.find((p) => p.method === "TRADE_IN");

  const saleId = await prisma.$transaction(async (tx) => {
    let tradeInVehicleId = existing?.tradeInVehicleId ?? null;
    if (hasTradeIn && d.tradeIn && !tradeInVehicleId) {
      const first = await tx.vehicle.findFirst({ where: { storeId: ctx.storeId }, orderBy: { position: "asc" }, select: { position: true } });
      const t = await tx.vehicle.create({
        data: {
          ...d.tradeIn,
          storeId: ctx.storeId,
          price: tradeInPayment!.amount,
          status: "PREPARING",
          published: false,
          position: (first?.position ?? 1) - 1,
          purchaseDate: d.date,
          purchasePrice: tradeInPayment!.amount,
          purchaseSource: "TRADE_IN",
          purchaseFrom: customer.name,
          purchasePayment: `Troca na venda do ${vehicle.brand} ${vehicle.model}`,
        },
      });
      tradeInVehicleId = t.id;
    }

    const data = {
      vehicleId: vehicle.id,
      customerId: customer.id,
      status: d.status,
      date: d.date,
      price: d.price,
      commission,
      warrantyDays: d.warrantyDays,
      mileageAtSale: d.mileageAtSale ?? vehicle.mileage,
      notes: d.notes,
      tradeInVehicleId,
    } satisfies Partial<Prisma.SaleUncheckedCreateInput>;
    const payments = d.payments.map((p) => ({
      method: p.method,
      amount: p.amount,
      details: p.details,
      dueDate: p.dueDate,
      paidAt: p.paid === false ? null : d.date,
    }));

    let id: string;
    if (existing) {
      await tx.salePayment.deleteMany({ where: { saleId: existing.id } });
      await tx.sale.update({ where: { id: existing.id }, data: { ...data, payments: { create: payments } } });
      id = existing.id;
    } else {
      const last = await tx.sale.findFirst({ where: { storeId: ctx.storeId }, orderBy: { number: "desc" }, select: { number: true } });
      const created = await tx.sale.create({
        data: {
          ...data,
          storeId: ctx.storeId,
          number: (last?.number ?? 0) + 1,
          sellerId: ctx.user.id,
          sellerName: ctx.asAdmin ? `${ctx.user.name} (admin)` : ctx.user.name,
          payments: { create: payments },
        },
      });
      id = created.id;
    }
    await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: d.status === "COMPLETED" ? "SOLD" : "RESERVED" } });
    return id;
  });

  await audit(ctx, existing ? "venda.alterada" : d.status === "RESERVED" ? "venda.reservada" : "venda.criada", "sale", saleId, `${vehicle.brand} ${vehicle.model}: ${d.price}`);
  revalidatePath("/painel", "layout");
  return { id: saleId, message: "Venda salva." };
}

export async function cancelSale(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStoreUser();
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 255);
  if (reason.length < 3) return { error: "Informe o motivo do cancelamento.", fieldErrors: { reason: "Informe o motivo" } };
  const sale = await prisma.sale.findFirst({ where: { id, storeId: ctx.storeId } });
  if (!sale || sale.status === "CANCELED") return { error: "Venda não encontrada." };
  await prisma.$transaction([
    prisma.sale.update({ where: { id }, data: { status: "CANCELED", canceledAt: new Date(), cancelReason: reason } }),
    prisma.vehicle.update({ where: { id: sale.vehicleId }, data: { status: "AVAILABLE" } }),
  ]);
  await audit(ctx, "venda.cancelada", "sale", id, reason);
  revalidatePath("/painel", "layout");
  return {
    message: sale.tradeInVehicleId
      ? "Venda cancelada e veículo de volta ao estoque. Atenção: o veículo recebido na troca continua no estoque; ajuste-o se necessário."
      : "Venda cancelada e veículo de volta ao estoque.",
  };
}

/** Marca uma parcela (financiamento, promissória...) como recebida ou não. */
export async function setPaymentPaid(paymentId: string, paid: boolean) {
  const ctx = await requireStoreUser();
  const p = await prisma.salePayment.findFirst({ where: { id: paymentId, sale: { storeId: ctx.storeId } } });
  if (!p) return;
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  await prisma.salePayment.update({ where: { id: paymentId }, data: { paidAt: paid ? today : null } });
  await audit(ctx, paid ? "parcela.recebida" : "parcela.reaberta", "sale", p.saleId);
  revalidatePath("/painel", "layout");
}
