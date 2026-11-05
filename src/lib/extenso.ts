/** Valor em reais por extenso: 1234.5 → "mil, duzentos e trinta e quatro reais e cinquenta centavos". */
const UNITS = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const TENS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const HUNDREDS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function upTo999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(HUNDREDS[h]);
  if (rest) {
    if (rest < 20) parts.push(UNITS[rest]);
    else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      parts.push(u ? `${TENS[t]} e ${UNITS[u]}` : TENS[t]);
    }
  }
  return parts.join(" e ");
}

function integerWords(n: number): string {
  if (n === 0) return "zero";
  const groups: number[] = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  const names: [string, string][] = [["", ""], ["mil", "mil"], ["milhão", "milhões"], ["bilhão", "bilhões"]];
  const parts: { text: string; value: number }[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (!g) continue;
    let text = i === 1 && g === 1 ? "mil" : upTo999(g);
    if (i >= 1 && !(i === 1 && g === 1)) text += ` ${g === 1 ? names[i][0] : names[i][1]}`;
    parts.push({ text, value: g });
  }
  // "e" antes do último grupo quando ele é < 100 ou centena redonda
  return parts
    .map((p, idx) => {
      if (idx === 0) return p.text;
      const last = idx === parts.length - 1;
      const useE = last && (p.value < 100 || p.value % 100 === 0);
      return `${useE ? " e " : last ? " " : ", "}${p.text}`;
    })
    .join("");
}

export function valorPorExtenso(value: number) {
  const cents = Math.round(value * 100);
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  const parts: string[] = [];
  if (reais > 0) {
    const big = reais >= 1_000_000 && reais % 1_000_000 === 0;
    parts.push(`${integerWords(reais)}${big ? " de" : ""} ${reais === 1 ? "real" : "reais"}`);
  }
  if (centavos > 0) parts.push(`${integerWords(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  return parts.length ? parts.join(" e ") : "zero reais";
}
