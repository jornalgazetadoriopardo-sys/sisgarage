/**
 * O TiDB Cloud exige conexão criptografada. Se o DATABASE_URL vier sem
 * "sslaccept", acrescenta "sslaccept=strict" (erro comum ao copiar o endereço).
 */
export function normalizeDatabaseUrl(raw) {
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    if (url.hostname.endsWith("tidbcloud.com") && !url.searchParams.has("sslaccept")) {
      url.searchParams.set("sslaccept", "strict");
      return url.toString();
    }
  } catch {
    /* deixa como está; o Prisma mostra o erro */
  }
  return raw;
}
