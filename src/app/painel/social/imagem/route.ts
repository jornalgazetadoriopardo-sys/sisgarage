import { NextResponse, type NextRequest } from "next/server";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatKm, formatPrice, showPreviousPrice, slugify } from "@/lib/format";
import { fuelLabels, transmissionLabels } from "@/lib/labels";
import { imageDataUrl, logoDataUrl, renderInstitutionalPost, renderVehiclePost, type BrandData } from "@/lib/social/render";
import { FORMATS, INSTITUTIONAL_TEMPLATES, VEHICLE_TEMPLATES, type InstitutionalTemplate, type PostFormat, type VehicleTemplate } from "@/lib/social/templates";

export const runtime = "nodejs";

/** Gera a imagem do post (PNG). Usada na pré-visualização, no download e no compartilhamento. */
export async function GET(req: NextRequest) {
  const { storeId, store } = await requireStoreUser();
  const p = req.nextUrl.searchParams;
  const fmt = (p.get("fmt") ?? "feed") as PostFormat;
  if (!(fmt in FORMATS)) return new NextResponse("Formato inválido", { status: 400 });
  const tpl = p.get("tpl") ?? "";
  const download = p.has("dl");

  const brand: BrandData = {
    name: store.name,
    logo: await logoDataUrl(store.logoUrl),
    color: /^#[0-9a-f]{6}$/i.test(store.brandColor ?? "") ? store.brandColor! : "#1d55d8",
    whatsapp: store.whatsapp ?? store.phone,
    city: `${store.city}/${store.state}`,
    instagram: store.instagram,
    hours: store.openingHours,
  };

  let image: Response;
  let name: string;
  if (p.get("kind") === "inst") {
    if (!(tpl in INSTITUTIONAL_TEMPLATES)) return new NextResponse("Modelo inválido", { status: 400 });
    const t = tpl as InstitutionalTemplate;
    const title = (p.get("title") || INSTITUTIONAL_TEMPLATES[t].title).slice(0, 80);
    const text = (p.get("text") ?? INSTITUTIONAL_TEMPLATES[t].text).slice(0, 220);
    const photos =
      t === "estoque"
        ? (await Promise.all(
            (await prisma.vehicle.findMany({
              where: { storeId, published: true, status: { in: ["AVAILABLE", "RESERVED"] }, photos: { some: {} } },
              orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
              take: 4,
              select: { photos: { orderBy: { position: "asc" }, take: 1, select: { url: true } } },
            })).map((v) => imageDataUrl(v.photos[0]?.url, 600)),
          )).filter((x): x is string => Boolean(x))
        : [];
    image = await renderInstitutionalPost(t, fmt, title, text, brand, photos);
    name = `post-${t}`;
  } else {
    if (!(tpl in VEHICLE_TEMPLATES)) return new NextResponse("Modelo inválido", { status: 400 });
    const v = await prisma.vehicle.findFirst({
      where: { id: p.get("v") ?? "", storeId },
      include: { photos: { orderBy: { position: "asc" }, select: { url: true } }, features: { select: { name: true } } },
    });
    if (!v) return new NextResponse("Veículo não encontrado", { status: 404 });
    const idx = Math.min(Math.max(Number(p.get("foto") ?? 0) || 0, 0), Math.max(v.photos.length - 1, 0));
    const photo = await imageDataUrl(v.photos[idx]?.url, 1080);
    image = await renderVehiclePost(tpl as VehicleTemplate, fmt, {
      title: `${v.brand} ${v.model}`,
      subtitle: [v.engine, v.version].filter(Boolean).join(" "),
      year: `${v.yearManufacture}/${v.yearModel}`,
      km: formatKm(v.mileage),
      transmission: v.type === "MOTORCYCLE" ? null : transmissionLabels[v.transmission],
      fuel: fuelLabels[v.fuel],
      price: formatPrice(v.price),
      previousPrice: showPreviousPrice(v) ? formatPrice(v.previousPrice!) : null,
      features: v.features.map((f) => f.name),
      badge: v.featured ? v.featuredLabel || "Destaque" : null,
      photos: photo ? [photo] : [],
    }, brand);
    name = `post-${slugify(`${v.brand} ${v.model} ${v.yearModel}`)}-${tpl}`;
  }

  return new NextResponse(image.body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=60",
      ...(download ? { "Content-Disposition": `attachment; filename="${name}-${fmt}.png"` } : {}),
    },
  });
}
