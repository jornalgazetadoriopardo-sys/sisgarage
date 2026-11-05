import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatKm, formatPhone, formatPrice, showPreviousPrice, vehiclePath } from "@/lib/format";
import { fuelLabels, transmissionLabels } from "@/lib/labels";
import { absoluteUrl } from "@/lib/site";
import { SocialStudio } from "@/components/social/SocialStudio";
import { PageHeader } from "@/components/ui";

export default async function SocialPage({ searchParams }: { searchParams: Promise<{ veiculo?: string }> }) {
  const { storeId, store } = await requireStoreUser();
  const { veiculo } = await searchParams;
  const soldSince = new Date(Date.now() - 60 * 86_400_000);
  const vehicles = await prisma.vehicle.findMany({
    where: { storeId, OR: [{ status: { not: "SOLD" } }, { status: "SOLD", updatedAt: { gte: soldSince } }] },
    orderBy: [{ status: "asc" }, { position: "asc" }],
    include: { photos: { orderBy: { position: "asc" }, select: { thumbUrl: true } }, features: { select: { name: true } } },
  });
  return (
    <div>
      <PageHeader title="Posts para redes sociais" subtitle="Escolha um modelo, confira a prévia e compartilhe. A imagem usa a cor e o logo da loja (Dados da loja)." />
      <SocialStudio
        presetVehicleId={vehicles.some((v) => v.id === veiculo) ? veiculo : undefined}
        store={{
          name: store.name,
          city: `${store.city}/${store.state}`,
          phone: store.whatsapp || store.phone ? formatPhone((store.whatsapp || store.phone)!) : null,
          instagram: store.instagram,
          hours: store.openingHours,
          site: absoluteUrl(`/lojas/${store.slug}`),
        }}
        vehicles={vehicles.map((v) => ({
          id: v.id,
          title: `${v.brand} ${v.model}${v.version ? ` ${v.version}` : ""}`,
          brand: v.brand,
          model: v.model,
          year: `${v.yearManufacture}/${v.yearModel}`,
          km: formatKm(v.mileage),
          transmission: v.type === "MOTORCYCLE" ? null : transmissionLabels[v.transmission],
          fuel: fuelLabels[v.fuel],
          price: formatPrice(v.price),
          previousPrice: showPreviousPrice(v) ? formatPrice(v.previousPrice!) : null,
          features: v.features.map((f) => f.name),
          thumbs: v.photos.map((p) => p.thumbUrl),
          sold: v.status === "SOLD",
          link: absoluteUrl(vehiclePath(v)),
        }))}
      />
    </div>
  );
}
