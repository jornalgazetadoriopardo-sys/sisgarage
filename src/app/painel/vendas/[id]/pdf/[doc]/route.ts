import { NextResponse } from "next/server";
import { requireStoreUser } from "@/lib/auth";
import { loadSaleForDocs } from "@/lib/pdf/sale-data";
import { availableDocuments, renderSaleDocument, SALE_DOCUMENTS, type SaleDocKind } from "@/lib/pdf/sale-documents";
import { slugify } from "@/lib/format";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; doc: string }> }) {
  const ctx = await requireStoreUser();
  const { id, doc } = await params;
  if (!(doc in SALE_DOCUMENTS)) return new NextResponse("Documento inválido", { status: 404 });
  const data = await loadSaleForDocs(id, ctx.storeId);
  if (!data) return new NextResponse("Venda não encontrada", { status: 404 });
  const kind = doc as SaleDocKind;
  if (!availableDocuments(data.status, data.warrantyDays).includes(kind)) {
    return new NextResponse("Documento indisponível para a situação desta venda", { status: 409 });
  }
  const pdf = await renderSaleDocument(kind, data);
  const name = `${slugify(SALE_DOCUMENTS[kind])}-venda-${data.number}.pdf`;
  const download = new URL(req.url).searchParams.has("baixar");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
