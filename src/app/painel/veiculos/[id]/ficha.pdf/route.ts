import { NextResponse } from "next/server";
import { canSeeFinance, requireStoreUser } from "@/lib/auth";
import { loadVehicleReport } from "@/lib/vehicle-report";
import { renderVehicleReport } from "@/lib/pdf/vehicle-report";
import { slugify, vehicleTitle } from "@/lib/format";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStoreUser();
  const { id } = await params;
  const report = await loadVehicleReport(ctx.storeId, id);
  if (!report) return new NextResponse("Veículo não encontrado", { status: 404 });
  const pdf = await renderVehicleReport(report, canSeeFinance(ctx));
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ficha-${slugify(vehicleTitle(report.v))}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
