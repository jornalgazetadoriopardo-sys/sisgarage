import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
/* eslint-disable @next/next/no-img-element */
import { prisma } from "@/lib/db";
import { searchVehicles, type VehicleSearch } from "@/lib/vehicles";
import { whatsappLink } from "@/lib/format";
import { VehicleCard } from "@/components/VehicleCard";
import { Pagination } from "@/components/Pagination";

const getStore = cache((slug: string) => prisma.store.findFirst({ where: { slug, status: "ACTIVE" } }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const store = await getStore((await params).slug);
  return store
    ? { title: `${store.name} — ${store.city}/${store.state}`, description: store.description ?? undefined }
    : { title: "Loja não encontrada" };
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
  const result = await searchVehicles(sp, store.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="card mb-8 flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        {store.logoUrl ? (
          <img src={store.logoUrl} alt={store.name} className="h-20 w-20 rounded-xl object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-brand-600 text-3xl font-bold text-white">
            {store.name.charAt(0)}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{store.name}</h1>
          <p className="text-slate-600">{store.address ? `${store.address} · ` : ""}{store.city}/{store.state}</p>
          {store.description && <p className="mt-2 max-w-3xl text-sm text-slate-600">{store.description}</p>}
        </div>
        {(store.whatsapp || store.phone) && (
          <a className="btn-whatsapp" target="_blank" rel="noopener noreferrer"
            href={whatsappLink((store.whatsapp || store.phone)!, `Olá, vim pelo SisGarage!`)}>
            WhatsApp da loja
          </a>
        )}
      </header>
      <h2 className="mb-4 text-xl font-bold">Estoque ({result.total})</h2>
      {result.items.length === 0 ? (
        <p className="card p-10 text-center text-slate-500">Nenhum veículo publicado no momento.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {result.items.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
        </div>
      )}
      <Pagination page={result.page} pages={result.pages} basePath={`/lojas/${slug}`} params={{ ...sp }} />
    </div>
  );
}
