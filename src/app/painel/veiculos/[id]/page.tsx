/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, ClipboardList, ExternalLink, Handshake, Megaphone, ReceiptText, Trash2 } from "lucide-react";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { plateLookupEnabled } from "@/lib/plate-lookup";
import { storeFeatureNames } from "@/lib/store-features";
import { formatKm, formatPrice, vehiclePath, vehicleTitle } from "@/lib/format";
import { vehicleStatusLabels } from "@/lib/labels";
import { deleteVehicle } from "@/app/actions/vehicles";
import { VehicleForm } from "@/components/VehicleForm";
import { PhotoManager } from "@/components/PhotoManager";
import { ConfirmButton } from "@/components/ConfirmButton";
import { GestaoTab } from "@/components/gestao/GestaoTab";
import { PageHeader, Section } from "@/components/ui";

const TABS = [
  { key: "anuncio", label: "Anúncio", icon: Megaphone },
  { key: "fotos", label: "Fotos", icon: Camera },
  { key: "gestao", label: "Gestão", icon: ClipboardList },
] as const;
type Tab = (typeof TABS)[number]["key"];

const statusChip = {
  PREPARING: "bg-slate-100 text-slate-700",
  AVAILABLE: "bg-emerald-50 text-emerald-700",
  RESERVED: "bg-amber-50 text-amber-700",
  SOLD: "bg-brand-50 text-brand-700",
} as const;

export default async function EditVehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string; falhas?: string; aba?: string }>;
}) {
  const ctx = await requireStoreUser();
  const { storeId, store } = ctx;
  const { id } = await params;
  const { salvo, falhas, aba } = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === aba) ? (aba as Tab) : "anuncio";

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, storeId },
    include: {
      photos: { orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true, url: true, thumbUrl: true } },
      features: { select: { name: true } },
      sales: { where: { status: { not: "CANCELED" } }, select: { id: true, number: true, status: true }, take: 1 },
      _count: { select: { sales: true } },
    },
  });
  if (!vehicle) notFound();
  const activeSale = vehicle.sales[0];
  const { photos, features } = vehicle;
  const isPublic = vehicle.published && ["AVAILABLE", "RESERVED"].includes(vehicle.status) && store.status === "ACTIVE";

  return (
    <div>
      <PageHeader
        back={{ href: "/painel/veiculos", label: "Veículos" }}
        title={
          <span className="flex items-center gap-4">
            <span className="hidden h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:block">
              {photos[0] && <img src={photos[0].thumbUrl} alt="" className="h-full w-full object-cover" />}
            </span>
            <span className="min-w-0">{vehicleTitle(vehicle)}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`badge ${statusChip[vehicle.status]}`}>{vehicleStatusLabels[vehicle.status]}</span>
            <span className="font-semibold text-slate-800">{formatPrice(vehicle.price)}</span>
            <span>{vehicle.yearManufacture}/{vehicle.yearModel}</span>
            <span>{formatKm(vehicle.mileage)}</span>
            {vehicle.plate && <span className="font-mono">{vehicle.plate}</span>}
          </span>
        }
        actions={
          <>
            {activeSale ? (
              <Link href={`/painel/vendas/${activeSale.id}`} className="btn-secondary">
                <ReceiptText className="h-4 w-4" /> {activeSale.status === "RESERVED" ? "Reserva" : "Venda"} nº {activeSale.number}
              </Link>
            ) : (
              <Link href={`/painel/vendas/nova?veiculo=${vehicle.id}`} className="btn-primary">
                <Handshake className="h-4 w-4" /> Registrar venda
              </Link>
            )}
            {isPublic && (
              <Link href={vehiclePath(vehicle)} target="_blank" className="btn-secondary">
                <ExternalLink className="h-4 w-4" /> Ver no site
              </Link>
            )}
          </>
        }
      />

      {salvo && <p className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Veículo cadastrado. Agora você pode completar as fotos e a gestão.</p>}
      {falhas && <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{falhas} foto(s) não puderam ser enviadas. Tente de novo na aba Fotos.</p>}

      {/* Abas */}
      <nav className="mb-8 flex gap-1 overflow-x-auto rounded-2xl bg-slate-200/60 p-1" aria-label="Seções do veículo">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/painel/veiculos/${id}${t.key === "anuncio" ? "" : `?aba=${t.key}`}`}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
            aria-current={tab === t.key ? "page" : undefined}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.key === "fotos" && <span className="text-xs font-normal text-slate-400">{photos.length}</span>}
          </Link>
        ))}
      </nav>

      {tab === "fotos" && (
        <PhotoManager key={photos.map((p) => p.id).join()} vehicleId={vehicle.id} photos={photos} watermarkOn={store.watermarkEnabled && Boolean(store.watermarkUrl)} />
      )}

      {tab === "gestao" && <GestaoTab ctx={ctx} vehicleId={vehicle.id} />}

      {tab === "anuncio" && (
        <div className="space-y-8">
          <VehicleForm
            vehicle={{
              id: vehicle.id, type: vehicle.type, brand: vehicle.brand, model: vehicle.model, version: vehicle.version,
              yearManufacture: vehicle.yearManufacture, yearModel: vehicle.yearModel, mileage: vehicle.mileage,
              color: vehicle.color, fuel: vehicle.fuel, transmission: vehicle.transmission, doors: vehicle.doors,
              engine: vehicle.engine, plate: vehicle.plate, renavam: vehicle.renavam, chassis: vehicle.chassis,
              description: vehicle.description, status: vehicle.status, published: vehicle.published,
              featured: vehicle.featured, featuredLabel: vehicle.featuredLabel,
              price: vehicle.price.toString(),
              previousPrice: vehicle.previousPrice?.toString() ?? null,
              features: features.map((f) => f.name),
            }}
            plateLookupEnabled={plateLookupEnabled()}
            storeFeatures={await storeFeatureNames(storeId)}
          />
          {vehicle._count.sales === 0 ? (
            <Section icon={Trash2} tone="red" title="Excluir veículo" description="Remove o veículo, as fotos, a gestão e o vínculo com os contatos. Não pode ser desfeito.">
              <form action={deleteVehicle}>
                <input type="hidden" name="id" value={vehicle.id} />
                <ConfirmButton message="Excluir este veículo definitivamente?" className="btn-danger">Excluir veículo</ConfirmButton>
              </form>
            </Section>
          ) : (
            <p className="text-sm text-slate-500">Este veículo tem venda registrada e não pode ser excluído. Para tirá-lo do site, desmarque “Publicar no site”.</p>
          )}
        </div>
      )}
    </div>
  );
}
