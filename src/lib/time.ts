/**
 * Horários da agenda. O sistema usa o horário de Brasília (UTC−3, sem horário de verão desde 2019).
 * Lojas em outros fusos (AM, AC, MT...) podem trocar APP_UTC_OFFSET no futuro.
 */
export const APP_TZ = "America/Sao_Paulo";
const OFFSET = "-03:00";

/** "2026-11-06" + "15:30" → Date (UTC) */
export function localToDate(day: string, time: string) {
  return new Date(`${day}T${time}:00${OFFSET}`);
}

/** Data local (AAAA-MM-DD) de um instante */
export function localDay(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: APP_TZ });
}

export function localTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", { timeZone: APP_TZ, hour: "2-digit", minute: "2-digit" });
}

export function todayLocal() {
  return localDay(new Date());
}

/** Início do dia local em UTC */
export function startOfLocalDay(day: string) {
  return localToDate(day, "00:00");
}

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekdayLabel(day: string, style: "long" | "short" = "long") {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: style, timeZone: "UTC" });
}

export function dayLabel(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" });
}

/** "2026-11" → limites do mês (datas "só dia" em UTC) */
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

export function currentMonth() {
  return todayLocal().slice(0, 7);
}

export function shiftMonth(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
}
