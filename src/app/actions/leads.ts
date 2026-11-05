"use server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { publicVehicleWhere } from "@/lib/vehicles";
import { zodErrors, type ActionState } from "@/lib/action-state";

const schema = z.object({
  vehicleId: z.string().min(1),
  name: z.string().trim().min(2, "Informe seu nome").max(100),
  phone: z.string().trim().min(10, "Informe um telefone com DDD").max(20),
  email: z.union([z.literal(""), z.string().trim().email("E-mail inválido")]).optional(),
  message: z.string().trim().max(1000).optional(),
});

export async function createLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { vehicleId, name, phone, email, message } = parsed.data;

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ...publicVehicleWhere },
    select: { id: true, storeId: true },
  });
  if (!vehicle) return { error: "Este veículo não está mais disponível." };

  await prisma.lead.create({
    data: { storeId: vehicle.storeId, vehicleId: vehicle.id, name, phone, email: email || null, message: message || null },
  });
  return { message: "Mensagem enviada! A loja vai entrar em contato com você." };
}
