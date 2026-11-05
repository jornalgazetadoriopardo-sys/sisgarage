import "server-only";
import { prisma } from "./db";
import { vehicleTitle } from "./format";

/** Opções para o formulário de agendamento. */
export async function agendaOptions(storeId: string) {
  const [vehicles, customers, users] = await Promise.all([
    prisma.vehicle.findMany({ where: { storeId, status: { not: "SOLD" } }, orderBy: [{ brand: "asc" }, { model: "asc" }], select: { id: true, brand: true, model: true, version: true, yearModel: true, plate: true } }),
    prisma.customer.findMany({ where: { storeId }, orderBy: { name: "asc" }, select: { id: true, name: true }, take: 1000 }),
    prisma.user.findMany({ where: { storeId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return {
    vehicles: vehicles.map((v) => ({ id: v.id, label: `${vehicleTitle(v)} ${v.yearModel}${v.plate ? ` · ${v.plate}` : ""}` })),
    customers: customers.map((c) => ({ id: c.id, label: c.name })),
    users: users.map((u) => ({ id: u.id, label: u.name })),
  };
}

/** Link "Adicionar ao Google Agenda" (sem integração: abre o Google com o evento preenchido). */
export function googleCalendarLink(a: { title: string; startsAt: Date; durationMin: number; details?: string; location?: string }) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(a.startsAt.getTime() + a.durationMin * 60_000);
  const p = new URLSearchParams({ action: "TEMPLATE", text: a.title, dates: `${fmt(a.startsAt)}/${fmt(end)}`, details: a.details ?? "", location: a.location ?? "" });
  return `https://calendar.google.com/calendar/render?${p}`;
}
