import Link from "next/link";
import { prisma } from "@/lib/db";
import { publicBrands, publicVehicleSelect, publicVehicleWhere } from "@/lib/vehicles";
import { VehicleCard } from "@/components/VehicleCard";
import { vehicleTypeLabels } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, latest, brands, totals] = await Promise.all([
    prisma.vehicle.findMany({
      where: { ...publicVehicleWhere, featured: true },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: publicVehicleSelect,
    }),
    prisma.vehicle.findMany({
      where: publicVehicleWhere,
      orderBy: { createdAt: "desc" },
      take: 8,
      select: publicVehicleSelect,
    }),
    publicBrands(),
    Promise.all([
      prisma.vehicle.count({ where: publicVehicleWhere }),
      prisma.store.count({ where: { status: "ACTIVE" } }),
    ]),
  ]);

  return (
    <>
      <section className="bg-gradient-to-br from-brand-700 to-brand-500 text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <h1 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">
            Seu próximo veículo está aqui.
          </h1>
          <p className="mt-3 max-w-xl text-brand-100 sm:text-lg">
            {totals[0]} veículos de {totals[1]} lojas, todos com contato direto com a loja.
          </p>
          <form action="/veiculos" className="mt-8 flex max-w-3xl flex-col gap-2 rounded-xl bg-white p-2 shadow-lg sm:flex-row">
            <input
              name="q"
              placeholder="Marca ou modelo. Ex.: Hilux, HB20, CG 160"
              className="flex-1 rounded-lg px-4 py-3 text-slate-900 outline-none"
              aria-label="Marca ou modelo"
            />
            <select name="tipo" className="rounded-lg border-0 bg-slate-100 px-3 py-3 text-slate-700" aria-label="Tipo">
              <option value="">Todos os tipos</option>
              {Object.entries(vehicleTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="btn-primary px-6 py-3 text-base">Buscar</button>
          </form>
          {brands.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {brands.slice(0, 10).map((b) => (
                <Link
                  key={b.brand}
                  href={`/veiculos?marca=${encodeURIComponent(b.brand)}`}
                  className="rounded-full bg-white/15 px-3 py-1 text-sm hover:bg-white/25"
                >
                  {b.brand}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-12">
        {featured.length > 0 && (
          <section>
            <h2 className="mb-4 text-2xl font-bold">Destaques</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
            </div>
          </section>
        )}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-bold">Chegaram agora</h2>
            <Link href="/veiculos" className="text-sm font-semibold text-brand-600 hover:underline">Ver todos</Link>
          </div>
          {latest.length === 0 ? (
            <p className="card p-8 text-center text-slate-500">Nenhum veículo publicado ainda.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {latest.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
            </div>
          )}
        </section>
        <section className="card flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Tem uma loja de veículos?</h2>
            <p className="text-slate-600">Anuncie seu estoque e gerencie sua loja em um só lugar.</p>
          </div>
          <Link href="/cadastro-loja" className="btn-primary">Cadastrar minha loja</Link>
        </section>
      </div>
    </>
  );
}
