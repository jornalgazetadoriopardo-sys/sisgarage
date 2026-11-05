// Build na Vercel.
// - Produção: confere as variáveis, aplica as migrações no banco e cria o administrador.
// - Preview (pull requests): só compila, sem mexer no banco de produção.
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
const env = process.env.VERCEL_ENV || "development";
console.log(`\n▶ SisGarage: build para o ambiente "${env}"\n`);

if (env === "production") {
  const required = ["DATABASE_URL", "AUTH_SECRET", "ADMIN_EMAIL", "ADMIN_PASSWORD"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(
      `\n✖ Faltam variáveis de ambiente: ${missing.join(", ")}\n` +
        `  Cadastre em Vercel → Settings → Environment Variables (ambiente Production) e faça Redeploy.\n`,
    );
    process.exit(1);
  }
  if ((process.env.AUTH_SECRET || "").length < 32) {
    console.error("\n✖ AUTH_SECRET muito curto: use 32 caracteres ou mais.\n");
    process.exit(1);
  }
  let dbName = "";
  try {
    dbName = decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1));
  } catch {
    console.error("\n✖ DATABASE_URL inválido. Formato: mysql://usuario:senha@host:porta/sisgarage?sslaccept=strict\n");
    process.exit(1);
  }
  if (!dbName || ["sys", "mysql", "information_schema", "performance_schema", "test"].includes(dbName.toLowerCase())) {
    console.error(
      `\n✖ DATABASE_URL aponta para o banco "${dbName || "(nenhum)"}". Use um banco próprio:\n` +
        "  1. No TiDB Cloud → SQL Editor, rode: CREATE DATABASE sisgarage;\n" +
        "  2. No DATABASE_URL, troque o nome antes do \"?\" por /sisgarage\n" +
        "     ex.: mysql://xxx.root:SENHA@gateway01....tidbcloud.com:4000/sisgarage?sslaccept=strict\n",
    );
    process.exit(1);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn("\n⚠ BLOB_READ_WRITE_TOKEN ausente: o site vai funcionar, mas o envio de fotos não. Conecte um Blob em Storage.\n");
  }
  run("npx prisma migrate deploy");
  run("npx tsx prisma/seed.ts");
} else {
  console.log("Preview: pulando migrações e seed (o banco não é alterado).");
}

run("npx next build");
