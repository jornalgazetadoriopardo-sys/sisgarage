import { NextResponse } from "next/server";
import { canSeeFinance, requireStoreUser } from "@/lib/auth";
import { loadStock } from "@/lib/vehicle-report";
import { vehicleTitle } from "@/lib/format";
import { vehicleStatusLabels } from "@/lib/labels";

/** Planilha do estoque (CSV com ; e vírgula decimal, abre direto no Excel em português). */
export async function GET() {
  const ctx = await requireStoreUser();
  if (!canSeeFinance(ctx)) return new NextResponse("Sem permissão", { status: 403 });
  const rows = await loadStock(ctx.storeId);
  const n = (v: number | null) => (v === null ? "" : v.toFixed(2).replace(".", ","));
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = ["Veículo", "Ano", "Placa", "Situação", "Entrada", "Dias na loja", "Preço", "FIPE", "Preço x FIPE %", "Variação FIPE %", "Ajustes de preço", "Compra", "Gastos", "Débitos", "Custo total", "Lucro previsto", "Margem %", "Visitas", "Contatos"];
  const lines = rows
    .sort((a, b) => b.m.days - a.m.days)
    .map(({ v, m, f }) => [
      esc(vehicleTitle(v)), String(v.yearModel), v.plate ?? "", vehicleStatusLabels[v.status], m.entry.toLocaleDateString("pt-BR"), String(m.days),
      n(m.price), n(m.fipeLast), n(m.vsFipe), n(m.fipeChange), String(m.priceChanges), n(f.purchase), n(f.expenses), n(f.taxes), n(f.cost),
      n(f.cost > 0 ? f.profit : null), n(f.margin), String(v.views), String(v._count.leads),
    ].join(";"));
  const csv = "﻿" + [header.join(";"), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="estoque-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
