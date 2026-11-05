"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, requireStoreOwner, requireStoreUser } from "@/lib/auth";
import { normalizeInstagram, onlyDigits } from "@/lib/format";
import { isValidCnpj } from "@/lib/br-docs";
import { BR_STATES } from "@/lib/labels";
import { deletePublic, rerenderVehiclePhoto, saveLogo, saveWatermarkImage, UploadError } from "@/lib/storage";
import { watermarkOf } from "@/lib/watermark";
import { zodErrors, type ActionState } from "@/lib/action-state";

const storeSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(100),
  legalName: z.string().trim().max(150).optional(),
  cnpj: z
    .string()
    .optional()
    .transform((v) => onlyDigits(v ?? ""))
    .refine((v) => v === "" || isValidCnpj(v), "CNPJ inválido"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  phone: z.string().trim().max(20).optional(),
  whatsapp: z.string().trim().max(20).optional(),
  instagram: z.string().optional().transform((v) => (v ? normalizeInstagram(v) : "")),
  openingHours: z.string().trim().max(200).optional(),
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
      logoUrl = await saveLogo(logo, `stores/${storeId}`);
    } catch (e) {
      if (e instanceof UploadError) return { error: e.message };
      throw e;
    }
    await deletePublic(store.logoUrl);
  }

  if (d.cnpj) {
    const dup = await prisma.store.findFirst({ where: { cnpj: d.cnpj, NOT: { id: storeId } }, select: { id: true } });
    if (dup) return { error: "Este CNPJ já está cadastrado em outra loja.", fieldErrors: { cnpj: "CNPJ já cadastrado" } };
  }
  await prisma.store.update({
    where: { id: storeId },
    data: {
      name: d.name,
      legalName: d.legalName || null,
      cnpj: d.cnpj || null,
      email: d.email,
      phone: d.phone || null,
      whatsapp: d.whatsapp || null,
      instagram: d.instagram || null,
      openingHours: d.openingHours || null,
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

const watermarkSchema = z.object({
  enabled: z.literal("on").optional().transform((v) => v === "on"),
  position: z.enum(["BOTTOM_RIGHT", "BOTTOM_LEFT", "TOP_RIGHT", "TOP_LEFT", "CENTER"]),
  size: z.coerce.number().int().min(5).max(60),
  opacity: z.coerce.number().int().min(10).max(100),
  makeWhite: z.literal("on").optional().transform((v) => v === "on"),
});

export async function updateWatermark(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { storeId, store } = await requireStoreOwner();
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = watermarkSchema.safeParse(raw);
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;

  let watermarkUrl = store.watermarkUrl;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    try {
      watermarkUrl = await saveWatermarkImage(image, `stores/${storeId}`, d.makeWhite);
    } catch (e) {
      if (e instanceof UploadError) return { error: e.message };
      throw e;
    }
    await deletePublic(store.watermarkUrl);
  }
  if (d.enabled && !watermarkUrl) return { error: "Envie a imagem da marca d'água (PNG com fundo transparente)." };

  await prisma.store.update({
    where: { id: storeId },
    data: { watermarkEnabled: d.enabled, watermarkUrl, watermarkPosition: d.position, watermarkSize: d.size, watermarkOpacity: d.opacity },
  });
  revalidatePath("/painel/loja");
  return { message: "Configuração salva. Ela vale para as próximas fotos; use “Aplicar em todas as fotos” para as já enviadas." };
}

/**
 * Refaz todas as fotos da loja a partir dos originais, com a configuração atual
 * (liga, troca ou remove a marca d'água). Pode levar alguns segundos.
 */
export async function reapplyWatermark(): Promise<ActionState> {
  const { storeId } = await requireStoreOwner();
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const wm = watermarkOf(store);
  const photos = await prisma.vehiclePhoto.findMany({ where: { vehicle: { storeId } } });
  // Na Vercel cada chamada tem limite de tempo; lojas com muitas fotos podem precisar clicar de novo.
  let done = 0;
  let failed = 0;
  for (const photo of photos) {
    try {
      const v = await rerenderVehiclePhoto(photo, `stores/${storeId}/vehicles/${photo.vehicleId}`, wm);
      await prisma.vehiclePhoto.update({
        where: { id: photo.id },
        data: { url: v.url, thumbUrl: v.thumbUrl, width: v.width, height: v.height, watermarked: v.watermarked },
      });
      done++;
    } catch {
      failed++;
    }
  }
  revalidatePath("/", "layout");
  return failed
    ? { error: `${done} foto(s) atualizadas, ${failed} com erro (original ausente).` }
    : { message: `${done} foto(s) atualizadas.` };
}
