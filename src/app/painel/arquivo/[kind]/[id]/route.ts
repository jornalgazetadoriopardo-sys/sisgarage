import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canSeeFinance, requireStoreUser } from "@/lib/auth";
import { readPrivateFile } from "@/lib/storage";

/** Abre um comprovante/documento. Só para usuários da loja dona do veículo. */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const ctx = await requireStoreUser();
  const { kind, id } = await params;
  const where = { id, vehicle: { storeId: ctx.storeId } };
  const row =
    kind === "documento" ? await prisma.vehicleDocument.findFirst({ where, select: { fileRef: true, fileName: true } })
    : kind === "gasto" && canSeeFinance(ctx) ? await prisma.vehicleExpense.findFirst({ where, select: { fileRef: true, fileName: true } })
    : kind === "debito" && canSeeFinance(ctx) ? await prisma.vehicleTax.findFirst({ where, select: { fileRef: true, fileName: true } })
    : null;
  if (!row?.fileRef) return new NextResponse("Arquivo não encontrado", { status: 404 });
  try {
    const { data, contentType } = await readPrivateFile(row.fileRef);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(row.fileName ?? "arquivo")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Arquivo não encontrado", { status: 404 });
  }
}
