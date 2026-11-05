import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { publicVehicleWhere } from "@/lib/vehicles";
import { vehiclePath } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [vehicles, stores] = await Promise.all([
    prisma.vehicle.findMany({
      where: publicVehicleWhere,
      select: { id: true, brand: true, model: true, version: true, yearModel: true, updatedAt: true },
    }),
    prisma.store.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/veiculos"), changeFrequency: "hourly", priority: 0.9 },
    ...stores.map((s) => ({ url: absoluteUrl(`/lojas/${s.slug}`), lastModified: s.updatedAt, priority: 0.7 })),
    ...vehicles.map((v) => ({ url: absoluteUrl(vehiclePath(v)), lastModified: v.updatedAt, priority: 0.8 })),
  ];
}
