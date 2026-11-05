"use server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStoreOwner } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseMoney } from "@/lib/format";
import { deletePrivateFile, savePrivateFile, UploadError } from "@/lib/storage";
import { zodErrors, type ActionState } from "@/lib/action-state";

const entrySchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().trim().min(1, "Escolha a categoria").max(40),
  description: z.string().trim().min(2, "Descreva o lançamento").max(200),
  amount: z.string().transform(parseMoney).refine((n) => Number.isFinite(n) && n > 0, "Informe o valor"),
  dueDate: z.string().min(1, "Informe o vencimento").transform((v) => new Date(`${v}T00:00:00Z`)),
  paid: z.literal("on").optional().transform((v) => v === "on"),
  repeat: z.coerce.number().int().min(1).max(36).default(1),
  notes: z.string().trim().max(255).optional().transform((v) => v || null),
});

function addMonths(d: Date, n: number) {
  const r = new Date(d);
  const day = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + n);
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r;
}

export async function addEntry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStoreOwner();
  const parsed = entrySchema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return zodErrors(parsed.error);
  const { repeat, paid, ...d } = parsed.data;

  let file: { ref: string; name: string } | null = null;
  const f = formData.get("file");
  if (f instanceof File && f.size > 0) {
    try {
      file = await savePrivateFile(f, `stores/${ctx.storeId}/financeiro`);
    } catch (e) {
      if (e instanceof UploadError) return { error: e.message };
      throw e;
    }
  }
  const groupId = repeat > 1 ? randomBytes(8).toString("hex") : null;
  await prisma.financialEntry.createMany({
    data: Array.from({ length: repeat }, (_, i) => ({
      ...d,
      storeId: ctx.storeId,
      description: repeat > 1 ? `${d.description} (${i + 1}/${repeat})` : d.description,
      dueDate: addMonths(d.dueDate, i),
      paidAt: paid && i === 0 ? d.dueDate : null,
      groupId,
      ...(i === 0 && file ? { fileRef: file.ref, fileName: file.name } : {}),
    })),
  });
  await audit(ctx, "financeiro.lancamento", "entry", groupId ?? undefined, `${d.description}: ${d.amount}${repeat > 1 ? ` x${repeat}` : ""}`);
  revalidatePath("/painel/financeiro");
  revalidatePath("/painel");
  return { message: repeat > 1 ? `${repeat} lançamentos criados (um por mês).` : "Lançamento criado." };
}

export async function setEntryPaid(id: string, paid: boolean) {
  const ctx = await requireStoreOwner();
  const e = await prisma.financialEntry.findFirst({ where: { id, storeId: ctx.storeId } });
  if (!e) return;
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  await prisma.financialEntry.update({ where: { id }, data: { paidAt: paid ? today : null } });
  revalidatePath("/painel/financeiro");
  revalidatePath("/painel");
}

export async function deleteEntry(id: string, wholeGroup: boolean) {
  const ctx = await requireStoreOwner();
  const e = await prisma.financialEntry.findFirst({ where: { id, storeId: ctx.storeId } });
  if (!e) return;
  const targets = wholeGroup && e.groupId
    ? await prisma.financialEntry.findMany({ where: { storeId: ctx.storeId, groupId: e.groupId, paidAt: null } })
    : [e];
  await prisma.financialEntry.deleteMany({ where: { id: { in: targets.map((t) => t.id) } } });
  await Promise.all(targets.map((t) => deletePrivateFile(t.fileRef)));
  await audit(ctx, "financeiro.excluido", "entry", id, `${e.description} (${targets.length})`);
  revalidatePath("/painel/financeiro");
  revalidatePath("/painel");
}
