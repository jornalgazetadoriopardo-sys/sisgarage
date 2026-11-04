/**
 * Dados de demonstração.
 * Cria o administrador da plataforma e, opcionalmente (SEED_DEMO=1), uma loja com veículos.
 *
 *   ADMIN_EMAIL=voce@exemplo.com ADMIN_PASSWORD=senha-forte npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

  if (process.env.SEED_DEMO !== "1") return;

  const store = await prisma.store.upsert({
    where: { slug: "garagem-demo" },
    update: {},
    create: {
      name: "Garagem Demo",
      slug: "garagem-demo",
      email: "contato@garagemdemo.local",
      phone: "51999990000",
      whatsapp: "51999990000",
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

  const demo = [
    { brand: "Chevrolet", model: "Onix", version: "1.0 Turbo LTZ", yearManufacture: 2021, yearModel: 2022, mileage: 38000, price: 79900, fuel: "FLEX", transmission: "AUTOMATIC", featured: true },
    { brand: "Toyota", model: "Corolla", version: "2.0 XEi", yearManufacture: 2020, yearModel: 2020, mileage: 52000, price: 112900, fuel: "FLEX", transmission: "CVT", featured: true },
    { brand: "Volkswagen", model: "Gol", version: "1.0 MPI", yearManufacture: 2018, yearModel: 2019, mileage: 71000, price: 46900, fuel: "FLEX", transmission: "MANUAL" },
    { brand: "Fiat", model: "Strada", version: "1.3 Freedom CD", yearManufacture: 2022, yearModel: 2023, mileage: 25000, price: 104500, fuel: "FLEX", transmission: "MANUAL" },
    { brand: "Honda", model: "CG 160", version: "Titan", type: "MOTORCYCLE", yearManufacture: 2023, yearModel: 2023, mileage: 8000, price: 17900, fuel: "FLEX", transmission: "MANUAL" },
    { brand: "Hyundai", model: "HB20", version: "1.0 Comfort", yearManufacture: 2019, yearModel: 2020, mileage: 60000, price: 58900, fuel: "FLEX", transmission: "MANUAL", status: "RESERVED" },
  ] as const;

  if ((await prisma.vehicle.count({ where: { storeId: store.id } })) === 0) {
    for (const v of demo) {
      await prisma.vehicle.create({
        data: {
          storeId: store.id,
          status: "AVAILABLE",
          published: true,
          features: ["Ar-condicionado", "Direção elétrica", "Vidros elétricos", "Travas elétricas"],
          description: "Veículo revisado, pneus em bom estado. Aceitamos troca e financiamos.",
          ...v,
        },
      });
    }
  }
  console.log("Loja demo: loja@sisgarage.local / loja12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
