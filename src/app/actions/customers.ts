"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStoreUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { isValidDocument } from "@/lib/br-docs";
import { BR_STATES } from "@/lib/labels";
import { onlyDigits } from "@/lib/format";
import { zodErrors, type ActionState } from "@/lib/action-state";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const customerSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(3, "Informe o nome completo").max(120),
  document: z
    .string()
    .optional()
    .transform((v) => onlyDigits(v ?? ""))
    .refine((v) => v === "" || isValidDocument(v), "CPF ou CNPJ inválido")
    .transform((v) => v || null),
  rg: text(20),
  birthDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(`${v}T00:00:00Z`) : null)),
  phone: text(20),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, "E-mail inválido")
    .transform((v) => v || null),
  zipCode: z
    .string()
    .optional()
    .transform((v) => onlyDigits(v ?? ""))
    .refine((v) => v === "" || v.length === 8, "CEP deve ter 8 dígitos")
    .transform((v) => v || null),
  address: text(200),
  district: text(80),
  city: text(80),
  state: z
    .union([z.literal(""), z.enum(BR_STATES)])
    .optional()
    .transform((v) => v || null),
  notes: text(2000),
});

export async function saveCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStoreUser();
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { id, ...data } = parsed.data;

  if (data.document) {
    const dup = await prisma.customer.findFirst({
      where: { storeId: ctx.storeId, document: data.document, ...(id ? { NOT: { id } } : {}) },
      select: { id: true, name: true },
    });
    if (dup) return { error: `Já existe um cliente com este documento: ${dup.name}.`, fieldErrors: { document: "Documento já cadastrado" } };
  }

  let customerId = id;
  if (id) {
    const owned = await prisma.customer.findFirst({ where: { id, storeId: ctx.storeId }, select: { id: true } });
    if (!owned) return { error: "Cliente não encontrado." };
    await prisma.customer.update({ where: { id }, data });
  } else {
    customerId = (await prisma.customer.create({ data: { ...data, storeId: ctx.storeId } })).id;
    await audit(ctx, "cliente.criado", "customer", customerId, data.name);
  }
  revalidatePath("/painel/clientes");
  return { id: customerId, message: "Cliente salvo." };
}

/** Transforma um contato recebido pelo site em cliente. */
export async function customerFromLead(formData: FormData) {
  const ctx = await requireStoreUser();
  const lead = await prisma.lead.findFirst({ where: { id: String(formData.get("id") ?? ""), storeId: ctx.storeId } });
  if (!lead) return;
  const phone = onlyDigits(lead.phone);
  const existing = await prisma.customer.findFirst({ where: { storeId: ctx.storeId, phone }, select: { id: true } });
  const id =
    existing?.id ??
    (await prisma.customer.create({ data: { storeId: ctx.storeId, name: lead.name, phone, email: lead.email } })).id;
  await prisma.lead.update({ where: { id: lead.id }, data: { read: true } });
  redirect(`/painel/clientes/${id}?novo=1`);
}

export async function deleteCustomer(formData: FormData) {
  const ctx = await requireStoreUser();
  const id = String(formData.get("id") ?? "");
  const c = await prisma.customer.findFirst({ where: { id, storeId: ctx.storeId }, include: { _count: { select: { sales: true } } } });
  if (!c || c._count.sales > 0) return;
  await prisma.customer.delete({ where: { id } });
  await audit(ctx, "cliente.excluido", "customer", id, c.name);
  redirect("/painel/clientes");
}
