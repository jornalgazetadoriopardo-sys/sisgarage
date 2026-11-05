"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StoreStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createSession, requireSuperAdmin } from "@/lib/auth";

export async function setStoreStatus(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as StoreStatus;
  if (!["PENDING", "ACTIVE", "SUSPENDED"].includes(status)) return;
  await prisma.store.update({ where: { id }, data: { status } });
  revalidatePath("/admin");
  revalidatePath("/");
}

/** Admin entra no painel de uma loja (fica registrado no histórico da loja). */
export async function actAsStore(formData: FormData) {
  const admin = await requireSuperAdmin();
  const storeId = String(formData.get("id") ?? "");
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { id: true } });
  if (!store) return;
  await createSession(admin, store.id);
  await prisma.auditLog.create({
    data: { storeId, userId: admin.id, userName: admin.name, asAdmin: true, action: "admin.entrou_no_painel" },
  });
  redirect("/painel");
}

export async function stopActing() {
  const admin = await requireSuperAdmin();
  await createSession(admin, null);
  redirect("/admin");
}
