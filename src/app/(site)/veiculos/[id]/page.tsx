import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { publicVehicleWhere } from "@/lib/vehicles";
import { formatKm, formatPrice, vehicleTitle, whatsappLink } from "@/lib/format";
import { fuelLabels, transmissionLabels, vehicleTypeLabels } from "@/lib/labels";
import { Gallery } from "@/components/Gallery";
import { LeadForm } from "@/components/LeadForm";

const getVehicle = cache(async (id: string) =>
  prisma.vehicle.findFirst({
    where: { id, ...publicVehicleWhere },
    select: {
      id: true, type: true, brand: true, model: true, version: true, yearManufacture: true, yearModel: true,
      mileage: true, price: true, color: true, fuel: true, transmission: true, doors: true,
      description: true, features: true, status: true,
      photos: { orderBy: { position: "asc" }, select: { id: true, url: true } },
      store: { select: { name: true, slug: true, city: true, state: true, whatsapp: true, phone: true, address: true } },
    },
  }),
);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const v = await getVehicle((await params).id);
  if (!v) return { title: "Veículo não encontrado" };
  const title = `${vehicleTitle(v)} ${v.yearModel}`;
  return {
    title,
    description: `${title} por ${formatPrice(v.price)} em ${v.store.city}/${v.store.state}. ${formatKm(v.mileage)}.`,
    openGraph: { images: v.photos[0] ? [v.photos[0].url] : [] },
  };
}

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await getVehicle(id);
  if (!v) notFound();
  await prisma.vehicle.update({ where: { id }, data: { views: { increment: 1 } } });

  const title = vehicleTitle(v);
  const specs: [string, string][] = [
    ["Ano", `${v.yearManufacture}/${v.yearModel}`],
    ["Quilometragem", formatKm(v.mileage)],
    ["Câmbio", transmissionLabels[v.transmission]],
    ["Combustível", fuelLabels[v.fuel]],
    ["Tipo", vehicleTypeLabels[v.type]],
    ...(v.color ? [["Cor", v.color] as [string, string]] : []),
    ...(v.doors ? [["Portas", String(v.doors)] as [string, string]] : []),
  ];
  const contact = v.store.whatsapp || v.store.phone;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/veiculos" className="hover:underline">Veículos</Link> /{" "}
        <Link href={`/veiculos?marca=${encodeURIComponent(v.brand)}`} className="hover:underline">{v.brand}</Link> /{" "}
        <span className="text-slate-700">{v.model}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <Gallery photos={v.photos} alt={title} />
          <section className="card p-6">
            <h2 className="mb-4 text-lg font-bold">Ficha técnica</h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {specs.map(([k, val]) => (
                <div key={k}>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt>
                  <dd className="font-semibold">{val}</dd>
                </div>
              ))}
            </dl>
          </section>
          {v.features.length > 0 && (
            <section className="card p-6">
              <h2 className="mb-4 text-lg font-bold">Itens e opcionais</h2>
              <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {v.features.map((f) => (
                  <li key={f} className="flex items-center gap-2"><span className="text-green-600">✓</span>{f}</li>
                ))}
              </ul>
            </section>
          )}
          {v.description && (
            <section className="card p-6">
              <h2 className="mb-2 text-lg font-bold">Sobre o veículo</h2>
              <p className="whitespace-pre-line text-slate-700">{v.description}</p>
            </section>
          )}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            {v.status === "RESERVED" && <span className="badge mb-2 bg-amber-100 text-amber-800">Reservado</span>}
            <h1 className="text-2xl font-bold leading-tight">{v.brand} {v.model}</h1>
            {v.version && <p className="text-slate-500">{v.version}</p>}
            <p className="mt-4 text-3xl font-extrabold text-brand-700">{formatPrice(v.price)}</p>
            {contact && (
              <a
                className="btn-whatsapp mt-4 w-full py-3"
                href={whatsappLink(contact, `Olá! Vi o ${title} ${v.yearModel} no SisGarage e tenho interesse.`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Conversar no WhatsApp
              </a>
            )}
          </div>
          <div className="card p-6">
            <h2 className="mb-3 font-bold">Enviar mensagem para a loja</h2>
            <LeadForm vehicleId={v.id} vehicleName={`${title} ${v.yearModel}`} />
          </div>
          <Link href={`/lojas/${v.store.slug}`} className="card block p-6 hover:border-brand-500">
            <p className="text-xs uppercase tracking-wide text-slate-500">Anunciado por</p>
            <p className="text-lg font-bold">{v.store.name}</p>
            <p className="text-sm text-slate-600">{v.store.address ? `${v.store.address} · ` : ""}{v.store.city}/{v.store.state}</p>
            <p className="mt-2 text-sm font-semibold text-brand-600">Ver estoque da loja →</p>
          </Link>
        </aside>
      </div>
    </div>
  );
}
