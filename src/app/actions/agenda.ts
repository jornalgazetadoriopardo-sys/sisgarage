"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStoreUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { onlyDigits } from "@/lib/format";
import { localToDate } from "@/lib/time";
import { zodErrors, type ActionState } from "@/lib/action-state";

const TYPES = ["TEST_DRIVE", "VISIT", "INSPECTION", "DISPATCHER", "WORKSHOP", "DELIVERY", "OTHER"] as const;
const STATUSES = ["REQUESTED", "SCHEDULED", "DONE", "NO_SHOW", "CANCELED"] as const;
const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

const schema = z.object({
  id: z.string().optional(),
  type: z.enum(TYPES),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Informe o horário"),
  durationMin: z.coerce.number().int().min(15).max(600).default(60),
  title: opt(120),
  vehicleId: opt(40),
  customerId: opt(40),
  leadId: opt(40),
  contactName: opt(120),
  contactPhone: z.string().optional().transform((v) => onlyDigits(v ?? "") || null),
  assignedToId: opt(40),
  notes: opt(2000),
});

export async function saveAppointment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStoreUser();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { id, day, time, ...d } = parsed.data;

  // vínculos precisam ser da própria loja
  const [vehicle, customer, lead, user] = await Promise.all([
    d.vehicleId ? prisma.vehicle.findFirst({ where: { id: d.vehicleId, storeId: ctx.storeId }, select: { id: true } }) : null,
    d.customerId ? prisma.customer.findFirst({ where: { id: d.customerId, storeId: ctx.storeId }, select: { id: true, name: true, phone: true } }) : null,
    d.leadId ? prisma.lead.findFirst({ where: { id: d.leadId, storeId: ctx.storeId }, select: { id: true, name: true, phone: true } }) : null,
    d.assignedToId ? prisma.user.findFirst({ where: { id: d.assignedToId, storeId: ctx.storeId }, select: { id: true } }) : null,
  ]);
  const data = {
    ...d,
    vehicleId: vehicle?.id ?? null,
    customerId: customer?.id ?? null,
    leadId: lead?.id ?? null,
    assignedToId: user?.id ?? null,
    contactName: d.contactName ?? customer?.name ?? lead?.name ?? null,
    contactPhone: d.contactPhone ?? customer?.phone ?? lead?.phone ?? null,
    startsAt: localToDate(day, time),
  };

  if (id) {
    const existing = await prisma.appointment.findFirst({ where: { id, storeId: ctx.storeId } });
    if (!existing) return { error: "Agendamento não encontrado." };
    await prisma.appointment.update({
      where: { id },
      data: { ...data, status: existing.status === "REQUESTED" ? "SCHEDULED" : existing.status },
    });
  } else {
    await prisma.appointment.create({ data: { ...data, storeId: ctx.storeId } });
  }
  await audit(ctx, id ? "agenda.alterado" : "agenda.criado", "appointment", id, `${d.type} ${day} ${time}`);
  revalidatePath("/painel", "layout");
  return { message: id ? "Agendamento atualizado." : "Agendamento criado." };
}

export async function setAppointmentStatus(id: string, status: (typeof STATUSES)[number]) {
  const ctx = await requireStoreUser();
  if (!STATUSES.includes(status)) return;
  const a = await prisma.appointment.findFirst({ where: { id, storeId: ctx.storeId } });
  if (!a) return;
  await prisma.appointment.update({ where: { id }, data: { status } });
  await audit(ctx, "agenda.situacao", "appointment", id, status);
  revalidatePath("/painel", "layout");
}

export async function deleteAppointment(id: string) {
  const ctx = await requireStoreUser();
  await prisma.appointment.deleteMany({ where: { id, storeId: ctx.storeId } });
  revalidatePath("/painel", "layout");
}
