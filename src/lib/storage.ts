import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Armazenamento de arquivos enviados. Hoje grava em disco (UPLOAD_DIR) e serve
 * pela rota /uploads/*. Para produção em nuvem, troque estas funções por S3/R2
 * mantendo a mesma assinatura.
 */

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB por foto
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function uploadRoot() {
  return path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");
}

export class UploadError extends Error {}

/** Grava a imagem e retorna a URL pública (/uploads/...). */
export async function saveImage(file: File, folder: string): Promise<string> {
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) throw new UploadError(`Formato não suportado: ${file.name}. Use JPG, PNG ou WEBP.`);
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError(`Arquivo muito grande: ${file.name} (máx. 8 MB).`);

  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "");
  const dir = path.join(uploadRoot(), safeFolder);
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${safeFolder}/${name}`;
}

export async function deleteImage(url: string) {
  if (!url.startsWith("/uploads/")) return;
  const full = path.resolve(uploadRoot(), url.slice("/uploads/".length));
  if (!full.startsWith(uploadRoot() + path.sep)) return;
  await unlink(full).catch(() => undefined);
}
