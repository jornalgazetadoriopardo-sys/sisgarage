const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("pt-BR");

type Decimalish = number | string | { toString(): string };

export function toNumber(value: Decimalish | null | undefined) {
  return value === null || value === undefined ? 0 : Number(value.toString());
}

export function formatPrice(value: Decimalish) {
  return brl.format(toNumber(value));
}

export function formatKm(km: number) {
  return `${num.format(km)} km`;
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR");
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function onlyDigits(text: string) {
  return text.replace(/\D/g, "");
}

/** Link de WhatsApp (assume Brasil se não houver código do país). */
export function whatsappLink(phone: string, message?: string) {
  let digits = onlyDigits(phone);
  if (digits.length <= 11) digits = `55${digits}`;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

export function telLink(phone: string) {
  return `tel:+55${onlyDigits(phone).replace(/^55(?=\d{10,11}$)/, "")}`;
}

export function formatPhone(phone: string) {
  const d = onlyDigits(phone);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return phone;
}

/** Placa no formato antigo (ABC1234) ou Mercosul (ABC1D23). */
export function normalizePlate(plate: string) {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidPlate(plate: string) {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizePlate(plate));
}

export function plateEnding(plate: string | null | undefined) {
  return plate ? plate.slice(-1) : null;
}

export function vehicleTitle(v: { brand: string; model: string; version?: string | null }) {
  return [v.brand, v.model, v.version].filter(Boolean).join(" ");
}

/** URL amigável: /veiculos/<id>-honda-cg-160-titan-2024 */
export function vehiclePath(v: { id: string; brand: string; model: string; version?: string | null; yearModel: number }) {
  return `/veiculos/${v.id}-${slugify(`${vehicleTitle(v)} ${v.yearModel}`)}`;
}

/** Extrai o id do parâmetro da URL amigável (ids não contêm "-"). */
export function vehicleIdFromParam(param: string) {
  return param.split("-")[0];
}

/** Mostra o preço "De" apenas quando é maior que o preço atual. */
export function showPreviousPrice(v: { price: Decimalish; previousPrice: Decimalish | null }) {
  return v.previousPrice !== null && toNumber(v.previousPrice) > toNumber(v.price);
}

/** Instagram: aceita @loja, loja ou a URL; guarda só o usuário. */
export function normalizeInstagram(value: string) {
  const v = value.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(v) ? v : "";
}
