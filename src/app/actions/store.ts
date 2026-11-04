"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, requireStoreOwner, requireStoreUser } from "@/lib/auth";
import { onlyDigits } from "@/lib/format";
import { BR_STATES } from "@/lib/labels";
import { deleteImage, saveImage, UploadError } from "@/lib/storage";
import { zodErrors, type ActionState } from "@/lib/action-state";

const storeSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(100),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  phone: z.string().trim().max(20).optional(),
  whatsapp: z.string().trim().max(20).optional(),
  zipCode: z.string().transform(onlyDigits).refine((v) => v === "" || v.length === 8, "CEP deve ter 8 dígitos"),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2, "Informe a cidade").max(80),
  state: z.enum(BR_STATES, { message: "Selecione o estado" }),
  description: z.string().trim().max(2000).optional(),
});

export async function updateStore(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { storeId, store } = await requireStoreOwner();
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = storeSchema.safeParse(raw);
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;

  let logoUrl = store.logoUrl;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    try {
      logoUrl = await saveImage(logo, `stores/${storeId}`);
    } catch (e) {
      if (e instanceof UploadError) return { error: e.message };
      throw e;
    }
    if (store.logoUrl) await deleteImage(store.logoUrl);
  }

  await prisma.store.update({
    where: { id: storeId },
    data: {
      name: d.name,
      email: d.email,
      phone: d.phone || null,
      whatsapp: d.whatsapp || null,
      zipCode: d.zipCode || null,
      address: d.address || null,
      city: d.city,
      state: d.state,
      description: d.description || null,
      logoUrl,
    },
  });
  revalidatePath("/painel", "layout");
  revalidatePath(`/lojas/${store.slug}`);
  return { message: "Dados da loja salvos." };
}

const userSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(100),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export async function createStaffUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { storeId } = await requireStoreOwner();
  const parsed = userSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;
  if (await prisma.user.findUnique({ where: { email: d.email } })) {
    return { error: "Já existe um usuário com este e-mail.", fieldErrors: { email: "E-mail já cadastrado" } };
  }
  await prisma.user.create({
    data: { name: d.name, email: d.email, passwordHash: await hashPassword(d.password), role: "STORE_STAFF", storeId },
  });
  revalidatePath("/painel/usuarios");
  return { message: "Usuário criado. Passe o e-mail e a senha para a pessoa." };
}

export async function toggleStaffUser(formData: FormData) {
  const { storeId, user } = await requireStoreOwner();
  const id = String(formData.get("id") ?? "");
  if (id === user.id) return;
  const target = await prisma.user.findFirst({ where: { id, storeId, role: "STORE_STAFF" } });
  if (!target) return;
  await prisma.user.update({ where: { id }, data: { active: !target.active } });
  revalidatePath("/painel/usuarios");
}

export async function markLeadRead(formData: FormData) {
  const { storeId } = await requireStoreUser();
  const id = String(formData.get("id") ?? "");
  const read = formData.get("read") === "true";
  await prisma.lead.updateMany({ where: { id, storeId }, data: { read } });
  revalidatePath("/painel", "layout");
}
