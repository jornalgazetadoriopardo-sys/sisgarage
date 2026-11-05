import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { publicVehicleWhere, similarVehicles } from "@/lib/vehicles";
import {
  formatKm, formatPhone, formatPrice, plateEnding, showPreviousPrice, telLink,
  vehicleIdFromParam, vehiclePath, vehicleTitle, whatsappLink,
} from "@/lib/format";
import { fuelLabels, transmissionLabels, vehicleTypeLabels } from "@/lib/labels";
import { absoluteUrl } from "@/lib/site";
import { Calendar, Car, CheckCircle2, Droplet, Fuel, Gauge, Hash, MapPin, Palette, Phone, Settings2, DoorOpen, Store as StoreIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Gallery } from "@/components/Gallery";
import { LeadForm } from "@/components/LeadForm";
import { VehicleCard } from "@/components/VehicleCard";
import { JsonLd } from "@/components/JsonLd";

const getVehicle = cache(async (id: string) =>
  prisma.vehicle.findFirst({
    where: { id, ...publicVehicleWhere },
    include: {
      photos: { orderBy: { position: "asc" }, select: { id: true, url: true, thumbUrl: true } },
      features: { select: { name: true }, orderBy: { name: "asc" } },
      store: { select: { name: true, slug: true, city: true, state: true, whatsapp: true, phone: true, address: true } },
    },
  }),
);

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const v = await getVehicle(vehicleIdFromParam((await params).slug));
  if (!v) return { title: "Veículo não encontrado" };
  const title = `${vehicleTitle(v)} ${v.yearModel}`;
  const description = `${title} por ${formatPrice(v.price)} em ${v.store.city}/${v.store.state}. ${formatKm(v.mileage)}. ${v.store.name}.`;
  return {
    title,
    description,
    alternates: { canonical: vehiclePath(v) },
    openGraph: { title, description, images: v.photos[0] ? [absoluteUrl(v.photos[0].url)] : [] },
  };
}

export default async function VehiclePage({ params }: Props) {
  const { slug } = await params;
  const v = await getVehicle(vehicleIdFromParam(slug));
  if (!v) notFound();
  const canonical = vehiclePath(v);
  if (`/veiculos/${slug}` !== canonical) permanentRedirect(canonical);

  await prisma.vehicle.update({ where: { id: v.id }, data: { views: { increment: 1 } } });
  const similar = await similarVehicles(v);

  const title = vehicleTitle(v);
  const isMoto = v.type === "MOTORCYCLE";
  const specs: [LucideIcon, string, string | null | undefined][] = [
    [Calendar, "Ano", `${v.yearManufacture}/${v.yearModel}`],
    [Gauge, "Quilometragem", formatKm(v.mileage)],
    [Droplet, isMoto ? "Cilindrada" : "Motor", v.engine],
    [Settings2, "Câmbio", isMoto ? null : transmissionLabels[v.transmission]],
    [Fuel, "Combustível", fuelLabels[v.fuel]],
    [Car, "Tipo", vehicleTypeLabels[v.type]],
    [Palette, "Cor", v.color],
    [DoorOpen, "Portas", v.doors ? String(v.doors) : null],
    [Hash, "Final da placa", plateEnding(v.plate)],
  ];
  const whats = v.store.whatsapp || v.store.phone;
  const whatsMsg = `Olá! Tenho interesse no ${title} ${v.yearModel} (${formatPrice(v.price)}) que vi no SisGarage.`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 pb-32 sm:px-6 lg:pb-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": isMoto ? "Motorcycle" : "Car",
          name: `${title} ${v.yearModel}`,
          brand: { "@type": "Brand", name: v.brand },
          model: v.model,
          vehicleModelDate: String(v.yearModel),
          productionDate: String(v.yearManufacture),
          mileageFromOdometer: { "@type": "QuantitativeValue", value: v.mileage, unitCode: "KMT" },
          color: v.color ?? undefined,
          image: v.photos.map((p) => absoluteUrl(p.url)),
          url: absoluteUrl(canonical),
          offers: {
            "@type": "Offer",
            price: v.price.toString(),
            priceCurrency: "BRL",
            availability: "https://schema.org/InStock",
            seller: { "@type": "AutoDealer", name: v.store.name, url: absoluteUrl(`/lojas/${v.store.slug}`) },
          },
        }}
      />
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/veiculos" className="hover:underline">Veículos</Link> /{" "}
        <Link href={`/veiculos?marca=${encodeURIComponent(v.brand)}`} className="hover:underline">{v.brand}</Link> /{" "}
        <span className="text-slate-700">{v.model}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-8">
          <Gallery photos={v.photos} alt={title} />
          <section className="card p-6 sm:p-7">
            <h2 className="mb-5 text-lg font-semibold">Ficha técnica</h2>
            <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              {specs.filter(([, , val]) => val).map(([Icon, k, val]) => (
                <div key={k} className="flex items-start gap-3">
                  <span className="icon-box h-10 w-10 bg-slate-100 text-slate-500"><Icon className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">{k}</dt>
                    <dd className="font-semibold text-slate-900">{val}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>
          {v.features.length > 0 && (
            <section className="card p-6 sm:p-7">
              <h2 className="mb-5 text-lg font-semibold">Itens e opcionais</h2>
              <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {v.features.map((f) => (
                  <li key={f.name} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />{f.name}</li>
                ))}
              </ul>
            </section>
          )}
          {v.description && (
            <section className="card p-6 sm:p-7">
              <h2 className="mb-3 text-lg font-semibold">Sobre o veículo</h2>
              <p className="whitespace-pre-line text-slate-700">{v.description}</p>
            </section>
          )}
        </div>
        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <div className="card p-6 sm:p-7">
            <div className="mb-2 flex flex-wrap gap-1">
              {v.featured && <span className="badge bg-brand-600 text-white">{v.featuredLabel || "Destaque"}</span>}
              {v.status === "RESERVED" && <span className="badge bg-amber-100 text-amber-800">Reservado</span>}
            </div>
            <h1 className="text-2xl font-bold leading-tight">{v.brand} {v.model}</h1>
            {v.version && <p className="text-slate-500">{v.version}</p>}
            {showPreviousPrice(v) && <p className="mt-4 text-sm text-slate-400 line-through">De {formatPrice(v.previousPrice!)}</p>}
            <p className={`${showPreviousPrice(v) ? "" : "mt-4"} text-3xl font-extrabold text-brand-700`}>{formatPrice(v.price)}</p>
            <div className="mt-4 hidden gap-2 lg:flex">
              {whats && (
                <a className="btn-whatsapp flex-1 py-3" href={whatsappLink(whats, whatsMsg)} target="_blank" rel="noopener noreferrer">
                  Tenho interesse
                </a>
              )}
              {v.store.phone && <a className="btn-secondary py-3" href={telLink(v.store.phone)}>Ligar</a>}
            </div>
          </div>
          <div className="card p-6 sm:p-7">
            <h2 className="mb-3 font-bold">Enviar mensagem para a loja</h2>
            <LeadForm vehicleId={v.id} vehicleName={`${title} ${v.yearModel}`} />
          </div>
          <Link href={`/lojas/${v.store.slug}`} className="card block p-6 hover:border-brand-500">
            <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-500"><StoreIcon className="h-3.5 w-3.5" /> Anunciado por</p>
            <p className="text-lg font-bold">{v.store.name}</p>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{v.store.address ? `${v.store.address} · ` : ""}{v.store.city}/{v.store.state}</p>
            {v.store.phone && <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><Phone className="h-4 w-4 text-slate-400" />{formatPhone(v.store.phone)}</p>}
            <p className="mt-2 text-sm font-semibold text-brand-600">Ver estoque da loja →</p>
          </Link>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-xl font-bold">Veja também</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((s) => <VehicleCard key={s.id} vehicle={s} />)}
          </div>
        </section>
      )}

      {/* Barra fixa no celular */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-slate-500">{v.brand} {v.model} {v.yearModel}</p>
          <p className="font-bold text-brand-700">{formatPrice(v.price)}</p>
        </div>
        {v.store.phone && <a className="btn-secondary" href={telLink(v.store.phone)}>Ligar</a>}
        {whats && <a className="btn-whatsapp" href={whatsappLink(whats, whatsMsg)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
      </div>
    </div>
  );
}
