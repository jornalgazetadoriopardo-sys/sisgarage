import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { plateLookupEnabled } from "@/lib/plate-lookup";
import { storeFeatureNames } from "@/lib/store-features";
import { vehiclePath, vehicleTitle } from "@/lib/format";
import { deleteVehicle } from "@/app/actions/vehicles";
import { VehicleForm } from "@/components/VehicleForm";
import { PhotoManager } from "@/components/PhotoManager";
import { ConfirmButton } from "@/components/ConfirmButton";

export default async function EditVehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string; falhas?: string }>;
}) {
  const { storeId, store } = await requireStoreUser();
  const { id } = await params;
  const { salvo, falhas } = await searchParams;
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, storeId },
    include: {
      photos: { orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true, url: true, thumbUrl: true } },
      features: { select: { name: true } },
    },
  });
  if (!vehicle) notFound();
  const { photos, features, ...data } = vehicle;
  const isPublic = vehicle.published && ["AVAILABLE", "RESERVED"].includes(vehicle.status) && store.status === "ACTIVE";

  return (
    <div className="space-y-4">
      <Link href="/painel/veiculos" className="text-sm text-slate-500 hover:underline">← Veículos</Link>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{vehicleTitle(vehicle)}</h1>
        {isPublic && <Link href={vehiclePath(vehicle)} target="_blank" className="btn-secondary">Ver no site ↗</Link>}
      </div>
      {salvo && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Veículo cadastrado.</p>}
      {falhas && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {falhas} foto(s) não puderam ser enviadas. Tente enviá-las de novo abaixo.
        </p>
      )}
      <PhotoManager key={photos.map((p) => p.id).join()} vehicleId={vehicle.id} photos={photos} watermarkOn={store.watermarkEnabled && Boolean(store.watermarkUrl)} />
      <VehicleForm
        vehicle={{
          ...data,
          price: data.price.toString(),
          previousPrice: data.previousPrice?.toString() ?? null,
          features: features.map((f) => f.name),
        }}
        plateLookupEnabled={plateLookupEnabled()}
        storeFeatures={await storeFeatureNames(storeId)}
      />
      <section className="card border-red-200 p-6">
        <h2 className="font-bold text-red-700">Excluir veículo</h2>
        <p className="mb-3 text-sm text-slate-600">Remove o veículo, as fotos e o vínculo com os contatos. Não pode ser desfeito.</p>
        <form action={deleteVehicle}>
          <input type="hidden" name="id" value={vehicle.id} />
          <ConfirmButton message="Excluir este veículo definitivamente?" className="btn-danger">Excluir veículo</ConfirmButton>
        </form>
      </section>
    </div>
  );
}
