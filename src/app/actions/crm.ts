"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStoreUser } from "@/lib/auth";
import { onlyDigits } from "@/lib/format";
import { leadStatusLabels } from "@/lib/labels";
import { zodErrors, type ActionState } from "@/lib/action-state";

const STATUSES = ["NEW", "CONTACTED", "NEGOTIATING", "WON", "LOST"] as const;
const SOURCES = ["SITE", "WHATSAPP", "PHONE", "WALK_IN", "INSTAGRAM", "REFERRAL", "OTHER"] as const;

const newLeadSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(100),
  phone: z.string().transform(onlyDigits).refine((v) => v.length >= 10, "Telefone com DDD"),
  email: z.string().trim().max(191).optional().transform((v) => v || null),
  source: z.enum(SOURCES),
  vehicleId: z.string().optional().transform((v) => v || null),
  message: z.string().trim().max(2000).optional().transform((v) => v || null),
  nextFollowUp: z.string().optional().transform((v) => (v ? new Date(`${v}T00:00:00Z`) : null)),
});

/** Contato que chegou por WhatsApp, telefone, loja... (fora do site). */
export async function createLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStoreUser();
  const parsed = newLeadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;
  const vehicle = d.vehicleId ? await prisma.vehicle.findFirst({ where: { id: d.vehicleId, storeId: ctx.storeId }, select: { id: true } }) : null;
  const lead = await prisma.lead.create({
    data: { ...d, vehicleId: vehicle?.id ?? null, storeId: ctx.storeId, read: true, status: "CONTACTED", assignedToId: ctx.asAdmin ? null : ctx.user.id },
  });
  revalidatePath("/painel", "layout");
  redirect(`/painel/contatos/${lead.id}`);
}

async function owned(storeId: string, id: string) {
  return prisma.lead.findFirst({ where: { id, storeId } });
}

export async function updateLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStoreUser();
  const id = String(formData.get("id") ?? "");
  const lead = await owned(ctx.storeId, id);
  if (!lead) return { error: "Contato não encontrado." };
  const status = String(formData.get("status") ?? lead.status) as (typeof STATUSES)[number];
  if (!STATUSES.includes(status)) return { error: "Etapa inválida." };
  const follow = String(formData.get("nextFollowUp") ?? "");
  const assigned = String(formData.get("assignedToId") ?? "");
  const lostReason = String(formData.get("lostReason") ?? "").trim().slice(0, 200) || null;
  if (status === "LOST" && !lostReason) return { error: "Informe o motivo da perda.", fieldErrors: { lostReason: "Informe o motivo" } };
  const user = assigned ? await prisma.user.findFirst({ where: { id: assigned, storeId: ctx.storeId }, select: { id: true } }) : null;

  await prisma.$transaction([
    prisma.lead.update({
      where: { id },
      data: {
        status,
        read: true,
        nextFollowUp: follow ? new Date(`${follow}T00:00:00Z`) : null,
        assignedToId: user?.id ?? null,
        lostReason: status === "LOST" ? lostReason : null,
      },
    }),
    ...(status !== lead.status
      ? [prisma.leadNote.create({ data: { leadId: id, userName: ctx.user.name, text: `Etapa: ${leadStatusLabels[lead.status]} → ${leadStatusLabels[status]}${status === "LOST" && lostReason ? ` (${lostReason})` : ""}` } })]
      : []),
  ]);
  revalidatePath("/painel", "layout");
  return { message: "Contato atualizado." };
}

export async function addLeadNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStoreUser();
  const id = String(formData.get("id") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (text.length < 2) return { error: "Escreva a anotação.", fieldErrors: { text: "Escreva a anotação" } };
  const lead = await owned(ctx.storeId, id);
  if (!lead) return { error: "Contato não encontrado." };
  await prisma.$transaction([
    prisma.leadNote.create({ data: { leadId: id, userName: ctx.user.name, text: text.slice(0, 4000) } }),
    prisma.lead.update({ where: { id }, data: { read: true, ...(lead.status === "NEW" ? { status: "CONTACTED" } : {}) } }),
  ]);
  revalidatePath(`/painel/contatos/${id}`);
  return { message: "Anotação salva." };
}

/** Move o contato de etapa (arrastar no quadro / botões rápidos). */
export async function moveLead(id: string, status: (typeof STATUSES)[number]) {
  const ctx = await requireStoreUser();
  const lead = await owned(ctx.storeId, id);
  if (!lead || !STATUSES.includes(status) || lead.status === status || status === "LOST") return;
  await prisma.$transaction([
    prisma.lead.update({ where: { id }, data: { status, read: true } }),
    prisma.leadNote.create({ data: { leadId: id, userName: ctx.user.name, text: `Etapa: ${leadStatusLabels[lead.status]} → ${leadStatusLabels[status]}` } }),
  ]);
  revalidatePath("/painel", "layout");
}
