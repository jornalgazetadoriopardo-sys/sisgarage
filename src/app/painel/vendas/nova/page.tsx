import { canSeeFinance, requireStoreUser } from "@/lib/auth";
import { saleFormOptions } from "@/lib/sale-options";
import { SaleForm } from "@/components/SaleForm";
import { PageHeader } from "@/components/ui";

export default async function NewSalePage({ searchParams }: { searchParams: Promise<{ veiculo?: string; cliente?: string }> }) {
  const ctx = await requireStoreUser();
  const { veiculo, cliente } = await searchParams;
  const { vehicles, customers } = await saleFormOptions(ctx.storeId);
  return (
    <div>
      <PageHeader back={{ href: "/painel/vendas", label: "Vendas" }} title="Nova venda" subtitle="Registre a venda ou a reserva com sinal. Os documentos são gerados em seguida." />
      <SaleForm
        vehicles={vehicles}
        customers={customers}
        presetVehicleId={vehicles.some((v) => v.id === veiculo) ? veiculo : undefined}
        presetCustomerId={customers.some((c) => c.id === cliente) ? cliente : undefined}
        isOwner={canSeeFinance(ctx)}
        today={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
