"use client";

// A Vercel aceita no máximo ~4,5 MB por envio. Fotos de celular costumam passar disso,
// então o navegador reduz para no máximo 2560px (JPEG) antes de enviar.
export const MAX_SEND_BYTES = 4 * 1024 * 1024;
const MAX_SIDE = 2560;

export async function shrinkForUpload(file: File): Promise<File> {
  // PNG/WebP podem ter transparência (logo, marca d'água): só reduz se for grande demais
  const keepFormat = /image\/(png|webp)/.test(file.type) && file.size <= 3.5 * 1024 * 1024;
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) return file;
  if (keepFormat) return file;
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
