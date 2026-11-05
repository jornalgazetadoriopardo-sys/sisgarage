"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStoreUser } from "@/lib/auth";
import { isValidPlate, normalizePlate, onlyDigits, vehiclePath } from "@/lib/format";
import { deletePrivateFile, deleteVehiclePhotoFiles, saveVehiclePhoto, UploadError } from "@/lib/storage";
import { watermarkOf } from "@/lib/watermark";
import { audit } from "@/lib/audit";
import { lookupPlate, type PlateLookupResponse } from "@/lib/plate-lookup";
import { zodErrors, type ActionState } from "@/lib/action-state";

const MAX_PHOTOS = 30;
const currentYear = new Date().getFullYear();

/** Aceita "45.900", "45900", "45.900,50", "R$ 45.900". */
function parseMoney(v: string) {
  const clean = v.replace(/[^\d,]/g, "").replace(",", ".");
  return clean ? Number(clean) : NaN;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const vehicleSchema = z
  .object({
    type: z.enum(["CAR", "MOTORCYCLE", "TRUCK", "OTHER"]),
    brand: z.string().trim().min(1, "Informe a marca").max(60),
    model: z.string().trim().min(1, "Informe o modelo").max(80),
    version: optionalText(140),
    yearManufacture: z.coerce.number().int().min(1900, "Ano inválido").max(currentYear + 1, "Ano inválido"),
    yearModel: z.coerce.number().int().min(1900, "Ano inválido").max(currentYear + 2, "Ano inválido"),
    mileage: z.string().optional().transform((v) => Number(onlyDigits(v ?? "") || 0)),
    price: z
      .string()
      .transform(parseMoney)
      .refine((n) => Number.isFinite(n) && n > 0, "Informe o preço"),
    previousPrice: z
      .string()
      .optional()
      .transform((v) => (v ? parseMoney(v) : null))
      .refine((n) => n === null || Number.isFinite(n), "Valor inválido"),
    color: optionalText(40),
    fuel: z.enum(["FLEX", "GASOLINE", "ETHANOL", "DIESEL", "ELECTRIC", "HYBRID", "GNV"]),
    transmission: z.enum(["MANUAL", "AUTOMATIC", "CVT", "AUTOMATED"]),
    doors: z.string().optional().transform((v) => (v ? Number(v) : null)),
    engine: optionalText(30),
    plate: z
      .string()
      .optional()
      .transform((v) => (v ? normalizePlate(v) : ""))
      .refine((v) => v === "" || isValidPlate(v), "Placa inválida (ABC1234 ou ABC1D23)")
      .transform((v) => v || null),
    renavam: z
      .string()
      .optional()
      .transform((v) => onlyDigits(v ?? ""))
      .refine((v) => v === "" || v.length === 11 || v.length === 9, "Renavam deve ter 11 dígitos")
      .transform((v) => v || null),
    chassis: z
      .string()
      .trim()
      .toUpperCase()
      .optional()
      .refine((v) => !v || /^[A-HJ-NPR-Z0-9]{17}$/.test(v), "Chassi deve ter 17 caracteres")
      .transform((v) => v || null),
    description: optionalText(5000),
    status: z.enum(["PREPARING", "AVAILABLE", "RESERVED", "SOLD"]),
    published: z.literal("on").optional().transform((v) => v === "on"),
    featured: z.literal("on").optional().transform((v) => v === "on"),
    featuredLabel: optionalText(40),
  })
  .refine((d) => d.yearModel >= d.yearManufacture, {
    path: ["yearModel"],
    message: "Ano modelo não pode ser menor que o de fabricação",
  });

function parseVehicle(formData: FormData) {
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = vehicleSchema.safeParse(raw);
  if (!parsed.success) return { error: zodErrors(parsed.error) } as const;
  const data = parsed.data;
  if (data.type !== "CAR") data.doors = null;

  const features = [
    ...formData.getAll("features").map(String),
    ...String(formData.get("extraFeatures") ?? "").split(/[\n,;]/),
  ]
    .map((f) => f.trim().slice(0, 80))
    .filter(Boolean);
  return { data, features: [...new Set(features)].slice(0, 60) } as const;
}

async function plateTaken(storeId: string, plate: string | null, exceptId?: string) {
  if (!plate) return false;
  const found = await prisma.vehicle.findFirst({
    where: { storeId, plate, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  return Boolean(found);
}

function revalidateVehicle(v: { id: string; brand: string; model: string; version: string | null; yearModel: number }) {
  revalidatePath("/painel/veiculos");
  revalidatePath(vehiclePath(v));
}

export async function createVehicle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStoreUser();
  const { storeId } = ctx;
  const result = parseVehicle(formData);
  if ("error" in result) return result.error!;
  if (await plateTaken(storeId, result.data.plate)) {
    return { error: "Já existe um veículo com esta placa na sua loja.", fieldErrors: { plate: "Placa já cadastrada" } };
  }
  // Novo veículo entra no topo da vitrine da loja
  const first = await prisma.vehicle.findFirst({ where: { storeId }, orderBy: { position: "asc" }, select: { position: true } });
  const vehicle = await prisma.vehicle.create({
    data: {
      ...result.data,
      storeId,
      position: (first?.position ?? 1) - 1,
      features: { create: result.features.map((name) => ({ name })) },
    },
  });
  await audit(ctx, "veiculo.criado", "vehicle", vehicle.id, `${vehicle.brand} ${vehicle.model}`);
  revalidatePath("/painel/veiculos");
  // As fotos são enviadas em seguida pelo navegador, uma a uma (com progresso).
  return { id: vehicle.id, message: "Veículo cadastrado." };
}

export async function updateVehicle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireStoreUser();
  const { storeId } = ctx;
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.vehicle.findFirst({ where: { id, storeId }, select: { id: true } });
  if (!existing) return { error: "Veículo não encontrado." };

  const result = parseVehicle(formData);
  if ("error" in result) return result.error!;
  if (await plateTaken(storeId, result.data.plate, id)) {
    return { error: "Já existe um veículo com esta placa na sua loja.", fieldErrors: { plate: "Placa já cadastrada" } };
  }
  const vehicle = await prisma.$transaction(async (tx) => {
    await tx.vehicleFeature.deleteMany({ where: { vehicleId: id } });
    return tx.vehicle.update({
      where: { id },
      data: { ...result.data, features: { create: result.features.map((name) => ({ name })) } },
    });
  });
  await audit(ctx, "veiculo.alterado", "vehicle", id);
  revalidateVehicle(vehicle);
  return { message: "Alterações salvas." };
}

export type UploadedPhoto = { id: string; url: string; thumbUrl: string };

/** Recebe UMA foto por chamada (o navegador envia em fila e mostra o progresso). */
export async function uploadVehiclePhoto(
  formData: FormData,
): Promise<{ ok: true; photo: UploadedPhoto } | { ok: false; error: string }> {
  const { storeId, store } = await requireStoreUser();
  const id = String(formData.get("vehicleId") ?? "");
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Arquivo vazio." };

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, storeId },
    select: { id: true, _count: { select: { photos: true } } },
  });
  if (!vehicle) return { ok: false, error: "Veículo não encontrado." };
  if (vehicle._count.photos >= MAX_PHOTOS) return { ok: false, error: `Máximo de ${MAX_PHOTOS} fotos por veículo.` };

  try {
    const saved = await saveVehiclePhoto(file, `stores/${storeId}/vehicles/${id}`, watermarkOf(store));
    const last = await prisma.vehiclePhoto.findFirst({ where: { vehicleId: id }, orderBy: { position: "desc" } });
    const photo = await prisma.vehiclePhoto.create({
      data: { vehicleId: id, ...saved, position: (last?.position ?? -1) + 1 },
      select: { id: true, url: true, thumbUrl: true },
    });
    revalidatePath(`/painel/veiculos/${id}`);
    return { ok: true, photo };
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, error: e.message };
    throw e;
  }
}

/** Grava a nova ordem das fotos (a primeira vira a capa). */
export async function reorderVehiclePhotos(vehicleId: string, photoIds: string[]) {
  const { storeId } = await requireStoreUser();
  const photos = await prisma.vehiclePhoto.findMany({ where: { vehicleId, vehicle: { storeId } }, select: { id: true } });
  const owned = new Set(photos.map((p) => p.id));
  const ids = photoIds.filter((id) => owned.has(id));
  await prisma.$transaction(ids.map((id, position) => prisma.vehiclePhoto.update({ where: { id }, data: { position } })));
  revalidatePath(`/painel/veiculos/${vehicleId}`);
}

export async function deleteVehiclePhoto(photoId: string) {
  const { storeId } = await requireStoreUser();
  const photo = await prisma.vehiclePhoto.findFirst({ where: { id: photoId, vehicle: { storeId } } });
  if (!photo) return;
  await prisma.vehiclePhoto.delete({ where: { id: photo.id } });
  await deleteVehiclePhotoFiles(photo);
  revalidatePath(`/painel/veiculos/${photo.vehicleId}`);
}

/** Ordem manual dos veículos na vitrine da loja (arrastar na lista). */
export async function reorderVehicles(vehicleIds: string[]) {
  const { storeId } = await requireStoreUser();
  const vehicles = await prisma.vehicle.findMany({ where: { storeId }, select: { id: true } });
  const owned = new Set(vehicles.map((v) => v.id));
  const ids = vehicleIds.filter((id) => owned.has(id));
  await prisma.$transaction(ids.map((id, position) => prisma.vehicle.update({ where: { id }, data: { position } })));
  revalidatePath("/painel/veiculos");
}

export async function deleteVehicle(formData: FormData) {
  const ctx = await requireStoreUser();
  const { storeId } = ctx;
  const id = String(formData.get("id") ?? "");
  const vehicle = await prisma.vehicle.findFirst({ where: { id, storeId }, include: { photos: true, _count: { select: { sales: true } } } });
  if (!vehicle || vehicle._count.sales > 0) return; // veículo com venda registrada não pode ser excluído
  const docs = await prisma.vehicle.findUnique({
    where: { id },
    select: { expenses: { select: { fileRef: true } }, documents: { select: { fileRef: true } }, taxes: { select: { fileRef: true } } },
  });
  await prisma.vehicle.delete({ where: { id } });
  await Promise.all(vehicle.photos.map(deleteVehiclePhotoFiles));
  await Promise.all(
    [...(docs?.expenses ?? []), ...(docs?.documents ?? []), ...(docs?.taxes ?? [])].map((d) => deletePrivateFile(d.fileRef)),
  );
  await audit(ctx, "veiculo.excluido", "vehicle", id, `${vehicle.brand} ${vehicle.model}`);
  revalidatePath("/painel/veiculos");
  redirect("/painel/veiculos");
}

export async function quickUpdateVehicle(formData: FormData) {
  const { storeId } = await requireStoreUser();
  const id = String(formData.get("id") ?? "");
  const published = formData.get("published");
  const status = formData.get("status");
  const featured = formData.get("featured");
  const data: { published?: boolean; featured?: boolean; status?: "PREPARING" | "AVAILABLE" | "RESERVED" | "SOLD" } = {};
  if (published !== null) data.published = published === "true";
  if (featured !== null) data.featured = featured === "true";
  if (status && ["PREPARING", "AVAILABLE", "RESERVED", "SOLD"].includes(String(status))) {
    data.status = String(status) as typeof data.status;
  }
  await prisma.vehicle.updateMany({ where: { id, storeId }, data });
  revalidatePath("/painel/veiculos");
}

export async function lookupPlateAction(plate: string, renavam: string): Promise<PlateLookupResponse> {
  await requireStoreUser();
  if (!isValidPlate(plate)) return { ok: false, reason: "error", message: "Placa inválida." };
  return lookupPlate(normalizePlate(plate), onlyDigits(renavam));
}
