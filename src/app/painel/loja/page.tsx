import { requireStoreOwner } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storeStatusLabels } from "@/lib/labels";
import { StoreForm } from "@/components/StoreForm";
import { WatermarkForm } from "@/components/WatermarkForm";

export default async function StoreSettingsPage() {
  const { store } = await requireStoreOwner();
  const photoCount = await prisma.vehiclePhoto.count({ where: { vehicle: { storeId: store.id } } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dados da loja</h1>
      <p className="text-sm text-slate-500">
        Situação: <strong>{storeStatusLabels[store.status]}</strong>
        {store.cnpj && <> · CNPJ {store.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}</>}
      </p>
      <StoreForm store={store} />
      <WatermarkForm store={store} photoCount={photoCount} />
    </div>
  );
}
