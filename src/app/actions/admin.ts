"use server";
import { revalidatePath } from "next/cache";
import type { StoreStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";

export async function setStoreStatus(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as StoreStatus;
  if (!["PENDING", "ACTIVE", "SUSPENDED"].includes(status)) return;
  await prisma.store.update({ where: { id }, data: { status } });
  revalidatePath("/admin");
  revalidatePath("/");
}
