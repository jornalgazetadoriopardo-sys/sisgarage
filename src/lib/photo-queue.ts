"use client";
import { uploadVehiclePhoto, type UploadedPhoto } from "@/app/actions/vehicles";

export type QueueItem = { key: string; name: string; preview: string; status: "waiting" | "sending" | "done" | "error"; error?: string };

/** Envia as fotos uma a uma, avisando o progresso de cada uma. */
export async function uploadPhotoQueue(
  vehicleId: string,
  items: { key: string; file: File }[],
  onUpdate: (key: string, patch: Partial<QueueItem>, photo?: UploadedPhoto) => void,
) {
  let failures = 0;
  for (const { key, file } of items) {
    onUpdate(key, { status: "sending" });
    const fd = new FormData();
    fd.set("vehicleId", vehicleId);
    const prepared = await shrinkForUpload(file);
    if (prepared.size > MAX_SEND_BYTES) {
      failures++;
      onUpdate(key, { status: "error", error: "Foto grande demais e não foi possível reduzir. Converta para JPG." });
      continue;
    }
    fd.set("photo", prepared);
    try {
      const res = await uploadVehiclePhoto(fd);
      if (res.ok) onUpdate(key, { status: "done" }, res.photo);
      else {
        failures++;
        onUpdate(key, { status: "error", error: res.error });
      }
    } catch {
      failures++;
      onUpdate(key, { status: "error", error: "Falha de conexão ou arquivo grande demais." });
    }
  }
  return failures;
}

export function isImageFile(f: File) {
  return f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name);
}

// A Vercel aceita no máximo ~4,5 MB por envio. Fotos de celular costumam passar disso,
// então o navegador reduz para no máximo 2560px (JPEG) antes de enviar. O servidor ainda
// gera as versões finais (1600px + miniatura) e guarda esta como "original".
const MAX_SEND_BYTES = 4 * 1024 * 1024;
const MAX_SIDE = 2560;

async function shrinkForUpload(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 2 * 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // formato que o navegador não abre (ex.: HEIC no Chrome): envia como está
  }
}
