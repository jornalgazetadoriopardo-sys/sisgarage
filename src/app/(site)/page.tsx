import Link from "next/link";
import { ArrowRight, Bike, Car, MessageCircle, Search, ShieldCheck, Store, Truck } from "lucide-react";
import { prisma } from "@/lib/db";
import { publicBrands, publicVehicleSelect, publicVehicleWhere } from "@/lib/vehicles";
import { VehicleCard } from "@/components/VehicleCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, latest, brands, totals, byType] = await Promise.all([
    prisma.vehicle.findMany({ where: { ...publicVehicleWhere, featured: true }, orderBy: { updatedAt: "desc" }, take: 4, select: publicVehicleSelect }),
    prisma.vehicle.findMany({ where: publicVehicleWhere, orderBy: { createdAt: "desc" }, take: 8, select: publicVehicleSelect }),
    publicBrands(),
    Promise.all([prisma.vehicle.count({ where: publicVehicleWhere }), prisma.store.count({ where: { status: "ACTIVE" } })]),
    prisma.vehicle.groupBy({ by: ["type"], where: publicVehicleWhere, _count: { _all: true } }),
  ]);
  const count = (t: string) => byType.find((b) => b.type === t)?._count._all ?? 0;
  const categories = [
    { type: "CAR", label: "Carros", icon: Car },
    { type: "MOTORCYCLE", label: "Motos", icon: Bike },
    { type: "TRUCK", label: "Caminhões", icon: Truck },
  ].filter((c) => count(c.type) > 0);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
            <ShieldCheck className="h-4 w-4" /> {totals[0]} veículos de {totals[1]} lojas
          </p>
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight sm:text-6xl">Seu próximo veículo está aqui.</h1>
          <p className="mt-4 max-w-xl text-lg text-brand-100">Busque, compare e fale direto com a loja pelo WhatsApp.</p>
          <form action="/veiculos" className="mt-10 flex max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input name="q" placeholder="Marca ou modelo. Ex.: Hilux, HB20, CG 160" className="w-full rounded-xl py-3.5 pl-12 pr-4 text-slate-900 outline-none" aria-label="Marca ou modelo" />
            </div>
            <button className="btn-primary px-8 py-3.5 text-base">Buscar</button>
          </form>
          {brands.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {brands.slice(0, 10).map((b) => (
                <Link key={b.brand} href={`/veiculos?marca=${encodeURIComponent(b.brand)}`} className="rounded-full bg-white/10 px-4 py-1.5 text-sm ring-1 ring-white/20 hover:bg-white/20">
                  {b.brand}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 sm:px-6">
        {categories.length > 1 && (
          <section className="grid gap-4 sm:grid-cols-3">
            {categories.map((c) => (
              <Link key={c.type} href={`/veiculos?tipo=${c.type}`} className="card flex items-center gap-4 p-6 transition hover:border-brand-200 hover:shadow-md">
                <span className="icon-box h-14 w-14 bg-brand-50 text-brand-600"><c.icon className="h-7 w-7" /></span>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{c.label}</p>
                  <p className="text-sm text-slate-500">{count(c.type)} disponíveis</p>
                </div>
                <ArrowRight className="ml-auto h-5 w-5 text-slate-300" />
              </Link>
            ))}
          </section>
        )}

        {featured.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Destaques</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
            </div>
          </section>
        )}

        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Chegaram agora</h2>
            <Link href="/veiculos" className="btn-ghost text-brand-600">Ver todos <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {latest.length === 0 ? (
            <p className="card p-12 text-center text-slate-500">Nenhum veículo publicado ainda.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {latest.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
            </div>
          )}
        </section>

        <section className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: Search, title: "Busque com filtros", text: "Preço, ano, km, câmbio, opcionais e cidade." },
            { icon: MessageCircle, title: "Fale direto com a loja", text: "WhatsApp e mensagem, sem intermediários." },
            { icon: ShieldCheck, title: "Lojas verificadas", text: "Todas as lojas passam por aprovação." },
          ].map((b) => (
            <div key={b.title} className="flex gap-4">
              <span className="icon-box h-12 w-12 bg-brand-50 text-brand-600"><b.icon className="h-6 w-6" /></span>
              <div>
                <p className="font-semibold text-slate-900">{b.title}</p>
                <p className="text-sm text-slate-500">{b.text}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="card flex flex-col items-start gap-6 bg-gradient-to-r from-white to-brand-50 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div className="flex items-start gap-4">
            <span className="icon-box h-14 w-14 bg-brand-600 text-white"><Store className="h-7 w-7" /></span>
            <div>
              <h2 className="text-xl font-bold">Tem uma loja de veículos?</h2>
              <p className="text-slate-600">Anuncie o estoque e controle custos, documentação e FIPE em um só lugar.</p>
            </div>
          </div>
          <Link href="/cadastro-loja" className="btn-primary px-6 py-3">Cadastrar minha loja</Link>
        </section>
      </div>
    </>
  );
}
