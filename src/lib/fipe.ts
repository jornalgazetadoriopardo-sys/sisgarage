import "server-only";
import type { VehicleType } from "@prisma/client";

/**
 * Tabela FIPE pela API pública e gratuita do Parallelum (sem cadastro).
 * As respostas ficam em cache por 1 dia para respeitar o limite de uso.
 * Para trocar de provedor, mude FIPE_API_URL (mesmo formato de resposta).
 */
const BASE = (process.env.FIPE_API_URL || "https://parallelum.com.br/fipe/api/v1").replace(/\/$/, "");

export type FipeKind = "carros" | "motos" | "caminhoes";
export type FipeOption = { code: string; name: string };
export type FipePrice = {
  value: number;
  code: string; // código FIPE, ex.: 004278-1
  name: string; // Marca Modelo Ano Combustível
  reference: string; // "novembro de 2026"
  month: string; // AAAA-MM
};

export function fipeKindOf(type: VehicleType): FipeKind {
  return type === "MOTORCYCLE" ? "motos" : type === "TRUCK" ? "caminhoes" : "carros";
}

export function isFipeKind(v: string): v is FipeKind {
  return v === "carros" || v === "motos" || v === "caminhoes";
}

const safe = (v: string) => encodeURIComponent(v.replace(/[^\w-]/g, ""));

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10000) });
  if (res.status === 429) throw new Error("A consulta FIPE atingiu o limite de uso. Tente de novo mais tarde.");
  if (!res.ok) throw new Error(`Consulta FIPE indisponível (${res.status}).`);
  return res.json() as Promise<T>;
}

type Raw = { codigo: string | number; nome: string };
const opt = (r: Raw): FipeOption => ({ code: String(r.codigo), name: r.nome });

export async function fipeBrands(kind: FipeKind) {
  return (await get<Raw[]>(`/${kind}/marcas`)).map(opt);
}

export async function fipeModels(kind: FipeKind, brand: string) {
  return (await get<{ modelos: Raw[] }>(`/${kind}/marcas/${safe(brand)}/modelos`)).modelos.map(opt);
}

export async function fipeYears(kind: FipeKind, brand: string, model: string) {
  return (await get<Raw[]>(`/${kind}/marcas/${safe(brand)}/modelos/${safe(model)}/anos`)).map(opt);
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "novembro de 2026" → "2026-11" */
export function referenceToMonth(reference: string) {
  const m = reference.trim().toLowerCase().match(/^(\S+) de (\d{4})/);
  const idx = m ? MONTHS.indexOf(m[1]) : -1;
  if (!m || idx < 0) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${m[2]}-${String(idx + 1).padStart(2, "0")}`;
}

/** "R$ 45.900,00" → 45900 */
export function parseFipeValue(v: string) {
  return Number(v.replace(/[^\d,]/g, "").replace(",", "."));
}

export async function fipePrice(kind: FipeKind, brand: string, model: string, year: string): Promise<FipePrice> {
  const r = await get<{ Valor: string; Marca: string; Modelo: string; AnoModelo: number; Combustivel: string; CodigoFipe: string; MesReferencia: string }>(
    `/${kind}/marcas/${safe(brand)}/modelos/${safe(model)}/anos/${safe(year)}`,
  );
  const reference = r.MesReferencia.trim();
  const year32k = r.AnoModelo === 32000 ? "Zero km" : String(r.AnoModelo);
  return {
    value: parseFipeValue(r.Valor),
    code: r.CodigoFipe,
    name: `${r.Marca} ${r.Modelo} ${year32k} ${r.Combustivel}`.slice(0, 200),
    reference,
    month: referenceToMonth(reference),
  };
}
