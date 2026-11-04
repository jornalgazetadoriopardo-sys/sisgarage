"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStoreUser } from "@/lib/auth";
import { isValidPlate, normalizePlate, onlyDigits } from "@/lib/format";
import { deleteImage, saveImage, UploadError } from "@/lib/storage";
import { lookupPlate, type PlateLookupResponse } from "@/lib/plate-lookup";
import { zodErrors, type ActionState } from "@/lib/action-state";

const MAX_PHOTOS = 30;
const currentYear = new Date().getFullYear();

const money = z
  .string()
  .transform((v) => {
    // aceita "45.900", "45900", "45.900,50"
    const clean = v.replace(/[^\d,]/g, "").replace(",", ".");
    return clean ? Number(clean) : NaN;
  })
  .refine((n) => Number.isFinite(n) && n > 0, "Informe o preço");

const vehicleSchema = z
  .object({
    type: z.enum(["CAR", "MOTORCYCLE", "TRUCK", "OTHER"]),
    brand: z.string().trim().min(1, "Informe a marca").max(60),
    model: z.string().trim().min(1, "Informe o modelo").max(80),
    version: z.string().trim().max(120).optional(),
    yearManufacture: z.coerce.number().int().min(1900, "Ano inválido").max(currentYear + 1, "Ano inválido"),
    yearModel: z.coerce.number().int().min(1900, "Ano inválido").max(currentYear + 2, "Ano inválido"),
    mileage: z.string().transform((v) => Number(onlyDigits(v) || 0)),
    price: money,
    color: z.string().trim().max(40).optional(),
    fuel: z.enum(["FLEX", "GASOLINE", "ETHANOL", "DIESEL", "ELECTRIC", "HYBRID", "GNV"]),
    transmission: z.enum(["MANUAL", "AUTOMATIC", "CVT", "AUTOMATED"]),
    doors: z.string().optional().transform((v) => (v ? Number(v) : null)),
    plate: z
      .string()
      .optional()
      .transform((v) => (v ? normalizePlate(v) : ""))
      .refine((v) => v === "" || isValidPlate(v), "Placa inválida (ABC1234 ou ABC1D23)"),
    renavam: z
      .string()
      .optional()
      .transform((v) => onlyDigits(v ?? ""))
      .refine((v) => v === "" || v.length === 11 || v.length === 9, "Renavam deve ter 11 dígitos"),
    chassis: z.string().trim().toUpperCase().max(17).optional(),
    description: z.string().trim().max(5000).optional(),
    status: z.enum(["PREPARING", "AVAILABLE", "RESERVED", "SOLD"]),
    published: z.literal("on").optional(),
    featured: z.literal("on").optional(),
  })
  .refine((d) => d.yearModel >= d.yearManufacture, {
    path: ["yearModel"],
    message: "Ano modelo não pode ser menor que o de fabricação",
  });

function parseVehicle(formData: FormData) {
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = vehicleSchema.safeParse(raw);
  if (!parsed.success) return { error: zodErrors(parsed.error) } as const;
  const d = parsed.data;
  const features = formData
    .getAll("features")
    .map((f) => String(f).trim())
    .filter(Boolean);
  const extra = String(formData.get("extraFeatures") ?? "")
    .split(/[\n,;]/)
    .map((f) => f.trim())
    .filter(Boolean);
  return {
    data: {
      type: d.type,
      brand: d.brand,
      model: d.model,
      version: d.version || null,
      yearManufacture: d.yearManufacture,
      yearModel: d.yearModel,
      mileage: d.mileage,
      price: d.price,
      color: d.color || null,
      fuel: d.fuel,
      transmission: d.transmission,
      doors: d.doors,
      plate: d.plate || null,
      renavam: d.renavam || null,
      chassis: d.chassis || null,
      description: d.description || null,
      status: d.status,
      published: d.published === "on",
      featured: d.featured === "on",
      features: [...new Set([...features, ...extra])].slice(0, 60),
    },
  } as const;
}

function photoFiles(formData: FormData) {
  return formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
}

async function plateTaken(storeId: string, plate: string | null, exceptId?: string) {
  if (!plate) return false;
  const found = await prisma.vehicle.findFirst({
    where: { storeId, plate, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  return Boolean(found);
}

async function addPhotos(vehicleId: string, storeId: string, files: File[], startAt: number) {
  const urls: string[] = [];
  try {
    for (const file of files) urls.push(await saveImage(file, `stores/${storeId}/vehicles/${vehicleId}`));
  } catch (e) {
    await Promise.all(urls.map(deleteImage));
    throw e;
  }
  await prisma.vehiclePhoto.createMany({
    data: urls.map((url, i) => ({ vehicleId, url, position: startAt + i })),
  });
}

export async function createVehicle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { storeId } = await requireStoreUser();
  const result = parseVehicle(formData);
  if ("error" in result) return result.error!;
  const files = photoFiles(formData);
  if (files.length > MAX_PHOTOS) return { error: `Máximo de ${MAX_PHOTOS} fotos por veículo.` };
  if (await plateTaken(storeId, result.data.plate)) {
    return { error: "Já existe um veículo com esta placa na sua loja.", fieldErrors: { plate: "Placa já cadastrada" } };
  }

  const vehicle = await prisma.vehicle.create({ data: { ...result.data, storeId } });
  try {
    await addPhotos(vehicle.id, storeId, files, 0);
  } catch (e) {
    if (e instanceof UploadError) {
      revalidatePath("/painel/veiculos");
      redirect(`/painel/veiculos/${vehicle.id}?erroFoto=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }
  revalidatePath("/painel/veiculos");
  redirect(`/painel/veiculos/${vehicle.id}?salvo=1`);
}

export async function updateVehicle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { storeId } = await requireStoreUser();
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.vehicle.findFirst({ where: { id, storeId }, select: { id: true } });
  if (!existing) return { error: "Veículo não encontrado." };

  const result = parseVehicle(formData);
  if ("error" in result) return result.error!;
  if (await plateTaken(storeId, result.data.plate, id)) {
    return { error: "Já existe um veículo com esta placa na sua loja.", fieldErrors: { plate: "Placa já cadastrada" } };
  }
  await prisma.vehicle.update({ where: { id }, data: result.data });
  revalidatePath("/painel/veiculos");
  revalidatePath(`/veiculos/${id}`);
  return { message: "Alterações salvas." };
}

export async function uploadVehiclePhotos(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { storeId } = await requireStoreUser();
  const id = String(formData.get("id") ?? "");
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, storeId },
    select: { id: true, _count: { select: { photos: true } } },
  });
  if (!vehicle) return { error: "Veículo não encontrado." };
  const files = photoFiles(formData);
  if (files.length === 0) return { error: "Selecione ao menos uma foto." };
  if (vehicle._count.photos + files.length > MAX_PHOTOS) {
    return { error: `Máximo de ${MAX_PHOTOS} fotos por veículo.` };
  }
  const last = await prisma.vehiclePhoto.findFirst({ where: { vehicleId: id }, orderBy: { position: "desc" } });
  try {
    await addPhotos(id, storeId, files, (last?.position ?? -1) + 1);
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/painel/veiculos/${id}`);
  return { message: `${files.length} foto(s) enviada(s).` };
}

async function ownedPhoto(photoId: string) {
  const { storeId } = await requireStoreUser();
  return prisma.vehiclePhoto.findFirst({ where: { id: photoId, vehicle: { storeId } } });
}

export async function deleteVehiclePhoto(photoId: string) {
  const photo = await ownedPhoto(photoId);
  if (!photo) return;
  await prisma.vehiclePhoto.delete({ where: { id: photo.id } });
  await deleteImage(photo.url);
  revalidatePath(`/painel/veiculos/${photo.vehicleId}`);
}

/** Move a foto para a primeira posição (capa) ou uma posição para os lados. */
export async function moveVehiclePhoto(photoId: string, direction: "first" | "left" | "right") {
  const photo = await ownedPhoto(photoId);
  if (!photo) return;
  const photos = await prisma.vehiclePhoto.findMany({
    where: { vehicleId: photo.vehicleId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  const ids = photos.map((p) => p.id);
  const from = ids.indexOf(photo.id);
  const to = direction === "first" ? 0 : direction === "left" ? Math.max(0, from - 1) : Math.min(ids.length - 1, from + 1);
  ids.splice(to, 0, ids.splice(from, 1)[0]);
  await prisma.$transaction(ids.map((id, position) => prisma.vehiclePhoto.update({ where: { id }, data: { position } })));
  revalidatePath(`/painel/veiculos/${photo.vehicleId}`);
}

export async function deleteVehicle(formData: FormData) {
  const { storeId } = await requireStoreUser();
  const id = String(formData.get("id") ?? "");
  const vehicle = await prisma.vehicle.findFirst({ where: { id, storeId }, include: { photos: true } });
  if (!vehicle) return;
  await prisma.vehicle.delete({ where: { id } });
  await Promise.all(vehicle.photos.map((p) => deleteImage(p.url)));
  revalidatePath("/painel/veiculos");
  redirect("/painel/veiculos");
}

export async function quickUpdateVehicle(formData: FormData) {
  const { storeId } = await requireStoreUser();
  const id = String(formData.get("id") ?? "");
  const published = formData.get("published");
  const status = formData.get("status");
  const data: { published?: boolean; status?: "PREPARING" | "AVAILABLE" | "RESERVED" | "SOLD" } = {};
  if (published !== null) data.published = published === "true";
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
