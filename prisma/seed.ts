/**
 * Dados iniciais.
 *
 *   npm run db:seed          → cria o administrador da plataforma
 *   npm run db:seed:demo     → administrador + loja de demonstração com veículos
 *   (na Vercel roda a cada deploy; SEED_DEMO=1 inclui a loja demo. Nada é duplicado.)
 *
 * Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env antes de rodar em produção.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { normalizeDatabaseUrl } from "../src/lib/database-url.mjs";

const prisma = new PrismaClient({ datasourceUrl: normalizeDatabaseUrl(process.env.DATABASE_URL) });
const withDemo = process.argv.includes("--demo") || process.env.SEED_DEMO === "1";

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@sisgarage.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "admin12345";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Administrador",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "SUPER_ADMIN",
    },
  });
  console.log(`Administrador: ${adminEmail}`);
  if (!withDemo) return;

  const store = await prisma.store.upsert({
    where: { slug: "garagem-demo" },
    update: {},
    create: {
      name: "Garagem Demo",
      slug: "garagem-demo",
      email: "contato@garagemdemo.local",
      phone: "51999990000",
      whatsapp: "51999990000",
      instagram: "garagemdemo",
      openingHours: "Seg a sex 8h–18h · Sáb 8h–12h",
      address: "Av. Principal, 100 - Centro",
      city: "Rio Pardo",
      state: "RS",
      description: "Loja de demonstração do SisGarage.",
      status: "ACTIVE",
    },
  });
  await prisma.user.upsert({
    where: { email: "loja@sisgarage.local" },
    update: {},
    create: {
      name: "Dono da Garagem Demo",
      email: "loja@sisgarage.local",
      passwordHash: await bcrypt.hash("loja12345", 10),
      role: "STORE_OWNER",
      storeId: store.id,
    },
  });
  await prisma.user.upsert({
    where: { email: "vendedor@sisgarage.local" },
    update: {},
    create: {
      name: "Vendedor Demo",
      email: "vendedor@sisgarage.local",
      passwordHash: await bcrypt.hash("vendedor123", 10),
      role: "STORE_STAFF",
      storeId: store.id,
    },
  });

  const carFeatures = ["Ar-condicionado", "Direção elétrica", "Vidros elétricos", "Travas elétricas"];
  const demo: (Omit<Prisma.VehicleUncheckedCreateInput, "storeId"> & { opcionais: string[] })[] = [
    { brand: "Chevrolet", model: "Onix", version: "LTZ", engine: "1.0 Turbo", yearManufacture: 2021, yearModel: 2022, mileage: 38000, price: 79900, previousPrice: 84900, fuel: "FLEX", transmission: "AUTOMATIC", doors: 4, plate: "ABC1D23", featured: true, featuredLabel: "Único dono", opcionais: [...carFeatures, "Central multimídia", "Único dono"] },
    { brand: "Toyota", model: "Corolla", version: "XEi", engine: "2.0", yearManufacture: 2020, yearModel: 2020, mileage: 52000, price: 112900, fuel: "FLEX", transmission: "CVT", doors: 4, plate: "BRA2E19", featured: true, opcionais: [...carFeatures, "Bancos de couro", "Câmera de ré"] },
    { brand: "Volkswagen", model: "Gol", version: "MPI", engine: "1.0", yearManufacture: 2018, yearModel: 2019, mileage: 71000, price: 46900, fuel: "FLEX", transmission: "MANUAL", doors: 4, plate: "QWE4567", opcionais: carFeatures },
    { brand: "Fiat", model: "Strada", version: "Freedom CD", engine: "1.3", yearManufacture: 2022, yearModel: 2023, mileage: 25000, price: 104500, fuel: "FLEX", transmission: "MANUAL", doors: 4, plate: "RST8H90", opcionais: [...carFeatures, "Rodas de liga leve"] },
    { type: "MOTORCYCLE", brand: "Honda", model: "CG 160", version: "Titan", engine: "160 cc", yearManufacture: 2023, yearModel: 2023, mileage: 8000, price: 17900, fuel: "FLEX", transmission: "MANUAL", plate: "MTO1A23", opcionais: ["Freios ABS", "Partida elétrica", "Injeção eletrônica"] },
    { brand: "Hyundai", model: "HB20", version: "Comfort", engine: "1.0", yearManufacture: 2019, yearModel: 2020, mileage: 60000, price: 58900, fuel: "FLEX", transmission: "MANUAL", doors: 4, plate: "HBV2020", status: "RESERVED", opcionais: carFeatures },
  ];

  if ((await prisma.vehicle.count({ where: { storeId: store.id } })) === 0) {
    for (const [position, { opcionais, ...v }] of demo.entries()) {
      await prisma.vehicle.create({
        data: {
          status: "AVAILABLE",
          published: true,
          description: "Veículo revisado, pneus em bom estado. Aceitamos troca e financiamos.",
          ...v,
          storeId: store.id,
          position,
          features: { create: opcionais.map((name) => ({ name })) },
          priceHistory: { create: { price: v.price, userName: "Cadastro" } },
        },
      });
    }
  }
  console.log("Loja demo:  loja@sisgarage.local / loja12345");
  console.log("Vendedor:   vendedor@sisgarage.local / vendedor123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
