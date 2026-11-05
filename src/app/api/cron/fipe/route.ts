import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fipePrice, isFipeKind } from "@/lib/fipe";
import { recordFipe } from "@/lib/vehicle-management";

export const maxDuration = 60;

/**
 * Atualização mensal da FIPE (chamada uma vez por dia pela Vercel, ver vercel.json).
 * Atualiza até 40 veículos em estoque que ainda não foram consultados no mês corrente.
 * Protegida por CRON_SECRET (a Vercel envia "Authorization: Bearer <CRON_SECRET>").
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const vehicles = await prisma.vehicle.findMany({
    where: {
      status: { not: "SOLD" },
      fipeYearCode: { not: null },
      OR: [{ fipeCheckedAt: null }, { fipeCheckedAt: { lt: monthStart } }],
    },
    take: 40,
  });
  let ok = 0;
  let failed = 0;
  for (const v of vehicles) {
    if (!v.fipeType || !isFipeKind(v.fipeType) || !v.fipeBrandCode || !v.fipeModelCode || !v.fipeYearCode) continue;
    try {
      await recordFipe(v.id, await fipePrice(v.fipeType, v.fipeBrandCode, v.fipeModelCode, v.fipeYearCode));
      ok++;
    } catch {
      failed++;
    }
  }
  return NextResponse.json({ checked: vehicles.length, ok, failed });
}
