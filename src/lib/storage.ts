import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp, { type Sharp } from "sharp";

/**
 * Armazenamento e processamento de imagens no servidor.
 *
 * - O ORIGINAL é guardado em pasta privada (ORIGINALS_DIR), fora do que o site serve.
 *   Assim a marca d'água pode ser ligada, trocada ou removida depois (é reversível).
 * - O site recebe duas versões em WebP: grande (1600px) e miniatura (600px).
 * - O tipo do arquivo é conferido pelo conteúdo (sharp lê a imagem), não pela extensão.
 *
 * Para hospedar as fotos na nuvem (S3/R2), troque writePublic/deletePublic mantendo as assinaturas.
 */

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12 MB por foto (fotos de celular)
const FULL_SIZE = 1600;
const THUMB_SIZE = 600;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "heif", "avif"]);

export class UploadError extends Error {}

export function uploadRoot() {
  return path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");
}

export function originalsRoot() {
  return path.resolve(process.env.ORIGINALS_DIR || "./storage/originals");
}

function safeFolder(folder: string) {
  return folder.replace(/[^a-zA-Z0-9/_-]/g, "");
}

function randomName() {
  return randomBytes(8).toString("hex");
}

async function writePublic(rel: string, data: Buffer) {
  const full = path.join(uploadRoot(), rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return `/uploads/${rel.split(path.sep).join("/")}`;
}

/** Remove um arquivo público pela URL (/uploads/...). Ignora o que não existir. */
export async function deletePublic(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/")) return;
  const full = path.resolve(uploadRoot(), url.slice("/uploads/".length));
  if (!full.startsWith(uploadRoot() + path.sep)) return;
  await unlink(full).catch(() => undefined);
}

async function deleteOriginal(rel: string | null | undefined) {
  if (!rel) return;
  const full = path.resolve(originalsRoot(), rel);
  if (!full.startsWith(originalsRoot() + path.sep)) return;
  await unlink(full).catch(() => undefined);
}

async function readImageFile(file: File) {
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError(`Arquivo muito grande: ${file.name} (máx. 12 MB).`);
  const buffer = Buffer.from(await file.arrayBuffer());
  let format: string | undefined;
  try {
    format = (await sharp(buffer).metadata()).format;
  } catch {
    format = undefined;
  }
  if (!format || !ACCEPTED_FORMATS.has(format)) {
    throw new UploadError(`Formato não suportado: ${file.name}. Use JPG, PNG, WEBP ou HEIC.`);
  }
  return buffer;
}

// ---------- Marca d'água ----------

export type WatermarkConfig = {
  enabled: boolean;
  url: string | null; // /uploads/... (PNG)
  position: "BOTTOM_RIGHT" | "BOTTOM_LEFT" | "TOP_RIGHT" | "TOP_LEFT" | "CENTER";
  size: number; // % da largura
  opacity: number; // 10–100
};

async function loadPublic(url: string) {
  const full = path.resolve(uploadRoot(), url.slice("/uploads/".length));
  if (!full.startsWith(uploadRoot() + path.sep)) throw new Error("Caminho inválido");
  return readFile(full);
}

async function applyWatermark(image: Sharp, width: number, height: number, wm: WatermarkConfig) {
  if (!wm.enabled || !wm.url) return { image, applied: false };
  const logo = await loadPublic(wm.url).catch(() => null);
  if (!logo) return { image, applied: false };

  const targetW = Math.max(40, Math.round((width * Math.min(60, Math.max(5, wm.size))) / 100));
  const resized = sharp(logo).resize({ width: targetW, withoutEnlargement: false }).ensureAlpha();
  const { data, info } = await resized.raw().toBuffer({ resolveWithObject: true });
  // aplica a opacidade no canal alfa
  const alpha = Math.min(100, Math.max(10, wm.opacity)) / 100;
  for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * alpha);
  const overlay = await sharp(data, { raw: info }).png().toBuffer();

  const margin = Math.round(Math.min(width, height) * 0.03);
  const left =
    wm.position.endsWith("LEFT") ? margin
    : wm.position === "CENTER" ? Math.round((width - info.width) / 2)
    : width - info.width - margin;
  const top =
    wm.position.startsWith("TOP") ? margin
    : wm.position === "CENTER" ? Math.round((height - info.height) / 2)
    : height - info.height - margin;

  if (info.width >= width || info.height >= height) return { image, applied: false };
  return { image: image.composite([{ input: overlay, left: Math.max(0, left), top: Math.max(0, top) }]), applied: true };
}

// ---------- Fotos de veículos ----------

export type ProcessedPhoto = {
  url: string;
  thumbUrl: string;
  originalPath: string;
  width: number;
  height: number;
  watermarked: boolean;
};

/** Gera as versões públicas (grande + miniatura) a partir de um original. */
async function renderVersions(original: Buffer, folder: string, wm: WatermarkConfig) {
  const base = sharp(original).rotate(); // respeita a orientação EXIF do celular
  const { data: fullBuf, info } = await base
    .clone()
    .resize({ width: FULL_SIZE, height: FULL_SIZE, fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  const { image, applied } = await applyWatermark(sharp(fullBuf), info.width, info.height, wm);
  const full = await image.webp({ quality: 82 }).toBuffer();
  const thumb = await sharp(full).resize({ width: THUMB_SIZE, withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();

  const name = randomName();
  const url = await writePublic(path.join(folder, `${name}.webp`), full);
  const thumbUrl = await writePublic(path.join(folder, `${name}_t.webp`), thumb);
  return { url, thumbUrl, width: info.width, height: info.height, watermarked: applied };
}

export async function saveVehiclePhoto(file: File, folder: string, wm: WatermarkConfig): Promise<ProcessedPhoto> {
  const original = await readImageFile(file);
  const dir = safeFolder(folder);
  const originalPath = path.join(dir, `${randomName()}.orig`);
  const originalFull = path.join(originalsRoot(), originalPath);
  await mkdir(path.dirname(originalFull), { recursive: true });
  await writeFile(originalFull, original);
  try {
    const versions = await renderVersions(original, dir, wm);
    return { ...versions, originalPath };
  } catch (e) {
    await deleteOriginal(originalPath);
    throw new UploadError(`Não foi possível processar ${file.name}.`, { cause: e });
  }
}

/** Refaz as versões públicas a partir do original (ex.: ligar/desligar a marca d'água). */
export async function rerenderVehiclePhoto(
  photo: { url: string; thumbUrl: string; originalPath: string },
  wm: WatermarkConfig,
) {
  const original = await readFile(path.join(originalsRoot(), photo.originalPath));
  const folder = path.dirname(photo.originalPath);
  const versions = await renderVersions(original, folder, wm);
  // novo nome de arquivo: o navegador não mostra a versão antiga em cache
  await deletePublic(photo.url);
  await deletePublic(photo.thumbUrl);
  return versions;
}

export async function deleteVehiclePhotoFiles(photo: { url: string; thumbUrl: string; originalPath: string }) {
  await Promise.all([deletePublic(photo.url), deletePublic(photo.thumbUrl), deleteOriginal(photo.originalPath)]);
}

// ---------- Logo da loja e marca d'água ----------

/** Logo da loja: quadrado 400px WebP. */
export async function saveLogo(file: File, folder: string) {
  const buffer = await readImageFile(file);
  const out = await sharp(buffer).rotate().resize({ width: 400, height: 400, fit: "cover" }).webp({ quality: 85 }).toBuffer();
  return writePublic(path.join(safeFolder(folder), `logo-${randomName()}.webp`), out);
}

/** Imagem da marca d'água: PNG com transparência, sobras transparentes cortadas. */
export async function saveWatermarkImage(file: File, folder: string, makeWhite: boolean) {
  const buffer = await readImageFile(file);
  let img = sharp(buffer).ensureAlpha().trim().resize({ width: 1200, withoutEnlargement: true });
  if (makeWhite) {
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
    img = sharp(data, { raw: info });
  }
  const out = await img.png().toBuffer();
  return writePublic(path.join(safeFolder(folder), `marca-${randomName()}.png`), out);
}
