import { notFound } from "next/navigation";
import { canSeeFinance, requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dayInput } from "@/lib/format";
import { saleFormOptions } from "@/lib/sale-options";
import { SaleForm } from "@/components/SaleForm";
import { PageHeader } from "@/components/ui";

export default async function EditSalePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStoreUser();
  const { id } = await params;
  const sale = await prisma.sale.findFirst({ where: { id, storeId: ctx.storeId, status: { not: "CANCELED" } }, include: { payments: true } });
  if (!sale) notFound();
  const { vehicles, customers } = await saleFormOptions(ctx.storeId, sale.vehicleId);
  const finance = canSeeFinance(ctx);
  return (
    <div>
      <PageHeader back={{ href: `/painel/vendas/${id}`, label: `Venda nº ${sale.number}` }} title={sale.status === "RESERVED" ? "Concluir ou editar reserva" : "Editar venda"}
        subtitle={sale.status === "RESERVED" ? "Para concluir: escolha “Venda”, complete os pagamentos e salve." : undefined} />
      <SaleForm
        vehicles={vehicles}
        customers={customers}
        isOwner={finance}
        today={new Date().toISOString().slice(0, 10)}
        initial={{
          id: sale.id,
          vehicleId: sale.vehicleId,
          customerId: sale.customerId,
          status: sale.status as "RESERVED" | "COMPLETED",
          date: dayInput(sale.date),
          price: Number(sale.price),
          mileageAtSale: sale.mileageAtSale,
          warrantyDays: sale.warrantyDays,
          commission: finance && sale.commission ? Number(sale.commission) : null,
          notes: sale.notes ?? "",
          hasTradeIn: Boolean(sale.tradeInVehicleId),
          payments: sale.payments.map((p) => ({
            method: p.method,
            amount: Number(p.amount).toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
            details: p.details ?? "",
            dueDate: dayInput(p.dueDate),
            paid: Boolean(p.paidAt),
          })),
        }}
      />
    </div>
  );
}
