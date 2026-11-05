/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { searchVehicles, type VehicleSearch } from "@/lib/vehicles";
import { formatPhone, telLink, whatsappLink } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import { VehicleCard } from "@/components/VehicleCard";
import { Pagination } from "@/components/Pagination";
import { SortSelect } from "@/components/SortSelect";
import { JsonLd } from "@/components/JsonLd";

const getStore = cache((slug: string) => prisma.store.findFirst({ where: { slug, status: "ACTIVE" } }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const store = await getStore((await params).slug);
  if (!store) return { title: "Loja não encontrada" };
  const title = `${store.name} — ${store.city}/${store.state}`;
  return {
    title,
    description: store.description ?? `Veículos à venda na ${store.name}, em ${store.city}/${store.state}.`,
    alternates: { canonical: `/lojas/${store.slug}` },
    openGraph: { title, images: store.logoUrl ? [absoluteUrl(store.logoUrl)] : [] },
  };
}

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<VehicleSearch>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const store = await getStore(slug);
  if (!store) notFound();
  const result = await searchVehicles(sp, { storeId: store.id });
  const whats = store.whatsapp || store.phone;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AutoDealer",
          name: store.name,
          url: absoluteUrl(`/lojas/${store.slug}`),
          image: store.logoUrl ? absoluteUrl(store.logoUrl) : undefined,
          telephone: store.phone ?? store.whatsapp ?? undefined,
          address: {
            "@type": "PostalAddress",
            streetAddress: store.address ?? undefined,
            addressLocality: store.city,
            addressRegion: store.state,
            postalCode: store.zipCode ?? undefined,
            addressCountry: "BR",
          },
          sameAs: store.instagram ? [`https://instagram.com/${store.instagram}`] : undefined,
        }}
      />
      <header className="card mb-10 flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center">
        {store.logoUrl ? (
          <img src={store.logoUrl} alt={store.name} className="h-20 w-20 rounded-xl object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-brand-600 text-3xl font-bold text-white">
            {store.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 space-y-1">
          <h1 className="text-2xl font-bold">{store.name}</h1>
          <p className="text-slate-600">{store.address ? `${store.address} · ` : ""}{store.city}/{store.state}</p>
          {store.openingHours && <p className="text-sm text-slate-500">🕒 {store.openingHours}</p>}
          {store.description && <p className="max-w-3xl pt-1 text-sm text-slate-600">{store.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {whats && (
            <a className="btn-whatsapp" target="_blank" rel="noopener noreferrer" href={whatsappLink(whats, "Olá, vim pelo SisGarage!")}>
              WhatsApp
            </a>
          )}
          {store.phone && <a className="btn-secondary" href={telLink(store.phone)}>{formatPhone(store.phone)}</a>}
          {store.instagram && (
            <a className="btn-secondary" target="_blank" rel="noopener noreferrer" href={`https://instagram.com/${store.instagram}`}>
              @{store.instagram}
            </a>
          )}
        </div>
      </header>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">Estoque ({result.total})</h2>
        <SortSelect value={sp.ordem} />
      </div>
      {result.items.length === 0 ? (
        <p className="card p-10 text-center text-slate-500">Nenhum veículo publicado no momento.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {result.items.map((v) => <VehicleCard key={v.id} vehicle={v} showStore={false} />)}
        </div>
      )}
      <Pagination page={result.page} pages={result.pages} basePath={`/lojas/${slug}`} params={{ ...sp }} />
    </div>
  );
}
