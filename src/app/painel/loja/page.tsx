import { requireStoreOwner } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storeStatusLabels } from "@/lib/labels";
import { StoreForm } from "@/components/StoreForm";
import { WatermarkForm } from "@/components/WatermarkForm";
import { PageHeader } from "@/components/ui";

// "Aplicar em todas as fotos" pode demorar: até 60 s na Vercel (plano grátis)
export const maxDuration = 60;

export default async function StoreSettingsPage() {
  const { store } = await requireStoreOwner();
  const photoCount = await prisma.vehiclePhoto.count({ where: { vehicle: { storeId: store.id } } });
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dados da loja"
        subtitle={
          <>
            Situação: <strong>{storeStatusLabels[store.status]}</strong>
            {store.cnpj && <> · CNPJ {store.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}</>}
          </>
        }
      />
      <StoreForm store={store} />
      <WatermarkForm store={store} photoCount={photoCount} />
    </div>
  );
}
