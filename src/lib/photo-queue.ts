"use client";
import { uploadVehiclePhoto, type UploadedPhoto } from "@/app/actions/vehicles";
import { MAX_SEND_BYTES, shrinkForUpload } from "./image-shrink";

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
