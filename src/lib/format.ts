const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("pt-BR");

export function formatPrice(value: number | string | { toString(): string }) {
  return brl.format(Number(value.toString()));
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

/** Placa no formato antigo (ABC1234) ou Mercosul (ABC1D23). */
export function normalizePlate(plate: string) {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidPlate(plate: string) {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizePlate(plate));
}

export function vehicleTitle(v: { brand: string; model: string; version?: string | null }) {
  return [v.brand, v.model, v.version].filter(Boolean).join(" ");
}
