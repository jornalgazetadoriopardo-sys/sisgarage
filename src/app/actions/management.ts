"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStoreOwner, requireStoreUser, type StoreContext } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseMoney } from "@/lib/format";
import { deletePrivateFile, savePrivateFile, UploadError } from "@/lib/storage";
import { fipeKindOf, fipePrice, isFipeKind } from "@/lib/fipe";
import { recordFipe } from "@/lib/vehicle-management";
import { zodErrors, type ActionState } from "@/lib/action-state";

// ---------- utilitários ----------

async function ownedVehicle(ctx: StoreContext, id: string) {
  return prisma.vehicle.findFirst({ where: { id, storeId: ctx.storeId }, select: { id: true, type: true } });
}

function refresh(vehicleId: string) {
  revalidatePath(`/painel/veiculos/${vehicleId}`);
  revalidatePath("/painel");
}

const money = (msg: string) =>
  z
    .string()
    .transform(parseMoney)
    .refine((n) => Number.isFinite(n) && n >= 0, msg);
const optionalMoney = z
  .string()
  .optional()
  .transform((v) => (v ? parseMoney(v) : null))
  .refine((n) => n === null || (Number.isFinite(n) && n >= 0), "Valor inválido");
const day = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(`${v}T00:00:00Z`) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Data inválida");
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

function stringEntries(formData: FormData) {
  return Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
}

async function maybeFile(ctx: StoreContext, vehicleId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  return savePrivateFile(file, `stores/${ctx.storeId}/vehicles/${vehicleId}/docs`);
}

async function guarded(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
}

// ---------- compra (só dono) ----------

const purchaseSchema = z.object({
  vehicleId: z.string().min(1),
  purchaseDate: day,
  purchasePrice: optionalMoney,
  purchaseSource: z
    .enum(["PERSON", "DEALER", "AUCTION", "TRADE_IN", "OTHER", ""])
    .optional()
    .transform((v) => v || null),
  purchaseFrom: text(120),
  purchasePayment: text(120),
  purchaseNotes: text(2000),
});

export async function savePurchase(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStoreOwner();
  const parsed = purchaseSchema.safeParse(stringEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { vehicleId, ...data } = parsed.data;
  if (!(await ownedVehicle(ctx, vehicleId))) return { error: "Veículo não encontrado." };
  await prisma.vehicle.update({ where: { id: vehicleId }, data });
  await audit(ctx, "compra.salva", "vehicle", vehicleId);
  refresh(vehicleId);
  return { message: "Dados da compra salvos." };
}

// ---------- gastos (só dono) ----------

const expenseSchema = z.object({
  vehicleId: z.string().min(1),
  category: z.enum(["MECHANICS", "BODYWORK", "TIRES", "DETAILING", "ELECTRICAL", "DISPATCHER", "TRANSFER", "INSPECTION", "TRANSPORT", "COMMISSION", "OTHER"]),
  description: z.string().trim().min(2, "Descreva o gasto").max(200),
  amount: money("Informe o valor"),
  date: day.refine((d) => d !== null, "Informe a data"),
  supplier: text(120),
});

export async function addExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStoreOwner();
  const parsed = expenseSchema.safeParse(stringEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { vehicleId, date, ...data } = parsed.data;
  if (!(await ownedVehicle(ctx, vehicleId))) return { error: "Veículo não encontrado." };
  return guarded(async () => {
    const file = await maybeFile(ctx, vehicleId, formData);
    await prisma.vehicleExpense.create({
      data: { ...data, date: date!, vehicleId, createdById: ctx.user.id, fileRef: file?.ref, fileName: file?.name },
    });
    await audit(ctx, "gasto.criado", "vehicle", vehicleId, `${data.description}: ${data.amount}`);
    refresh(vehicleId);
    return { message: "Gasto lançado." };
  });
}

export async function deleteExpense(id: string) {
  const ctx = await requireStoreOwner();
  const e = await prisma.vehicleExpense.findFirst({ where: { id, vehicle: { storeId: ctx.storeId } } });
  if (!e) return;
  await prisma.vehicleExpense.delete({ where: { id } });
  await deletePrivateFile(e.fileRef);
  await audit(ctx, "gasto.excluido", "vehicle", e.vehicleId, `${e.description}: ${e.amount}`);
  refresh(e.vehicleId);
}

// ---------- documentação (dono e vendedor) ----------

const documentSchema = z.object({
  id: z.string().optional(),
  vehicleId: z.string().min(1),
  type: z.enum(["CRLV", "ATPV", "CAUTELAR", "INSPECTION", "POWER_OF_ATTORNEY", "SPARE_KEY", "MANUAL", "OWNER_ID", "OTHER"]),
  label: text(80),
  status: z.enum(["PENDING", "OK", "NOT_APPLICABLE"]),
  expiresAt: day,
  notes: text(255),
});

export async function saveDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStoreUser();
  const parsed = documentSchema.safeParse(stringEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { id, vehicleId, ...data } = parsed.data;
  if (!(await ownedVehicle(ctx, vehicleId))) return { error: "Veículo não encontrado." };
  if (data.type === "OTHER" && !data.label) return { error: "Dê um nome ao documento.", fieldErrors: { label: "Informe o nome" } };

  return guarded(async () => {
    const file = await maybeFile(ctx, vehicleId, formData);
    if (id) {
      const existing = await prisma.vehicleDocument.findFirst({ where: { id, vehicleId } });
      if (!existing) return { error: "Documento não encontrado." };
      await prisma.vehicleDocument.update({
        where: { id },
        data: { ...data, ...(file ? { fileRef: file.ref, fileName: file.name } : {}), ...(file && data.status === "PENDING" ? { status: "OK" } : {}) },
      });
      if (file) await deletePrivateFile(existing.fileRef);
    } else {
      await prisma.vehicleDocument.create({ data: { ...data, vehicleId, fileRef: file?.ref, fileName: file?.name } });
    }
    await audit(ctx, "documento.salvo", "vehicle", vehicleId, data.label ?? data.type);
    refresh(vehicleId);
    return { message: "Documento salvo." };
  });
}

export async function deleteDocument(id: string) {
  const ctx = await requireStoreUser();
  const d = await prisma.vehicleDocument.findFirst({ where: { id, vehicle: { storeId: ctx.storeId } } });
  if (!d) return;
  await prisma.vehicleDocument.delete({ where: { id } });
  await deletePrivateFile(d.fileRef);
  await audit(ctx, "documento.excluido", "vehicle", d.vehicleId, d.label ?? d.type);
  refresh(d.vehicleId);
}

// ---------- IPVA, licenciamento e multas (só dono) ----------

const taxSchema = z.object({
  vehicleId: z.string().min(1),
  kind: z.enum(["IPVA", "LICENSING", "FINE", "OTHER"]),
  description: text(200),
  amount: money("Informe o valor"),
  dueDate: day,
  paidAt: day,
});

export async function addTax(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStoreOwner();
  const parsed = taxSchema.safeParse(stringEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { vehicleId, ...data } = parsed.data;
  if (!(await ownedVehicle(ctx, vehicleId))) return { error: "Veículo não encontrado." };
  return guarded(async () => {
    const file = await maybeFile(ctx, vehicleId, formData);
    await prisma.vehicleTax.create({ data: { ...data, vehicleId, fileRef: file?.ref, fileName: file?.name } });
    await audit(ctx, "debito.criado", "vehicle", vehicleId, `${data.kind}: ${data.amount}`);
    refresh(vehicleId);
    return { message: "Débito lançado." };
  });
}

export async function setTaxPaid(id: string, paid: boolean) {
  const ctx = await requireStoreOwner();
  const t = await prisma.vehicleTax.findFirst({ where: { id, vehicle: { storeId: ctx.storeId } } });
  if (!t) return;
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  await prisma.vehicleTax.update({ where: { id }, data: { paidAt: paid ? today : null } });
  await audit(ctx, paid ? "debito.pago" : "debito.reaberto", "vehicle", t.vehicleId, t.kind);
  refresh(t.vehicleId);
}

export async function deleteTax(id: string) {
  const ctx = await requireStoreOwner();
  const t = await prisma.vehicleTax.findFirst({ where: { id, vehicle: { storeId: ctx.storeId } } });
  if (!t) return;
  await prisma.vehicleTax.delete({ where: { id } });
  await deletePrivateFile(t.fileRef);
  await audit(ctx, "debito.excluido", "vehicle", t.vehicleId, `${t.kind}: ${t.amount}`);
  refresh(t.vehicleId);
}

// ---------- FIPE (dono e vendedor) ----------

export async function linkFipe(vehicleId: string, kind: string, brand: string, model: string, year: string): Promise<ActionState> {
  const ctx = await requireStoreUser();
  const v = await ownedVehicle(ctx, vehicleId);
  if (!v) return { error: "Veículo não encontrado." };
  const k = isFipeKind(kind) ? kind : fipeKindOf(v.type);
  try {
    const price = await fipePrice(k, brand, model, year);
    await recordFipe(vehicleId, price, { kind: k, brand, model, year });
    await audit(ctx, "fipe.vinculada", "vehicle", vehicleId, `${price.code} ${price.value}`);
    refresh(vehicleId);
    return { message: `FIPE vinculada: ${price.name}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha na consulta FIPE." };
  }
}

export async function refreshFipe(vehicleId: string): Promise<ActionState> {
  const ctx = await requireStoreUser();
  const v = await prisma.vehicle.findFirst({ where: { id: vehicleId, storeId: ctx.storeId } });
  if (!v?.fipeType || !v.fipeBrandCode || !v.fipeModelCode || !v.fipeYearCode || !isFipeKind(v.fipeType)) {
    return { error: "Vincule o veículo à tabela FIPE primeiro." };
  }
  try {
    const price = await fipePrice(v.fipeType, v.fipeBrandCode, v.fipeModelCode, v.fipeYearCode);
    await recordFipe(vehicleId, price);
    refresh(vehicleId);
    return { message: `Atualizado: referência ${price.reference}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha na consulta FIPE." };
  }
}

/** Consulta avulsa (página "Tabela FIPE"), sem vincular a um veículo. */
export async function consultFipe(kind: string, brand: string, model: string, year: string) {
  await requireStoreUser();
  if (!isFipeKind(kind)) return { error: "Tipo inválido." } as const;
  try {
    return { price: await fipePrice(kind, brand, model, year) } as const;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha na consulta FIPE." } as const;
  }
}
