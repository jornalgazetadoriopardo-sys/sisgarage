"use server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { publicVehicleWhere } from "@/lib/vehicles";
import { zodErrors, type ActionState } from "@/lib/action-state";
import { onlyDigits } from "@/lib/format";
import { localToDate } from "@/lib/time";

const schema = z.object({
  vehicleId: z.string().min(1),
  name: z.string().trim().min(2, "Informe seu nome").max(100),
  phone: z.string().trim().min(10, "Informe um telefone com DDD").max(20),
  email: z.union([z.literal(""), z.string().trim().email("E-mail inválido")]).optional(),
  message: z.string().trim().max(1000).optional(),
  // pedido de agendamento (opcional)
  schedule: z.enum(["", "TEST_DRIVE", "VISIT"]).optional(),
  day: z.string().optional(),
  time: z.string().optional(),
});

export async function createLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { vehicleId, name, phone, email, message, schedule, day, time } = parsed.data;
  let startsAt: Date | null = null;
  if (schedule) {
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !time || !/^\d{2}:\d{2}$/.test(time)) {
      return { error: "Escolha o dia e o horário desejados.", fieldErrors: { day: "Escolha o dia e o horário" } };
    }
    startsAt = localToDate(day, time);
    if (startsAt.getTime() < Date.now()) return { error: "Escolha uma data futura.", fieldErrors: { day: "Data já passou" } };
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ...publicVehicleWhere },
    select: { id: true, storeId: true },
  });
  if (!vehicle) return { error: "Este veículo não está mais disponível." };

  const lead = await prisma.lead.create({
    data: { storeId: vehicle.storeId, vehicleId: vehicle.id, name, phone: onlyDigits(phone), email: email || null, message: message || null },
  });
  if (schedule && startsAt) {
    await prisma.appointment.create({
      data: {
        storeId: vehicle.storeId, type: schedule, status: "REQUESTED", startsAt, vehicleId: vehicle.id, leadId: lead.id,
        contactName: name, contactPhone: onlyDigits(phone), notes: message || null,
      },
    });
    return { message: "Pedido de agendamento enviado! A loja vai confirmar o horário com você pelo telefone ou WhatsApp." };
  }
  return { message: "Mensagem enviada! A loja vai entrar em contato com você." };
}
