import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fipeBrands, fipeModels, fipeYears, isFipeKind } from "@/lib/fipe";

/** Listas da FIPE para os campos em cascata (marca → modelo → ano). Só para usuários logados. */
export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const p = req.nextUrl.searchParams;
  const kind = p.get("tipo") ?? "";
  if (!isFipeKind(kind)) return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  const brand = p.get("marca");
  const model = p.get("modelo");
  try {
    const items = model && brand ? await fipeYears(kind, brand, model) : brand ? await fipeModels(kind, brand) : await fipeBrands(kind);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha na consulta FIPE" }, { status: 502 });
  }
}
