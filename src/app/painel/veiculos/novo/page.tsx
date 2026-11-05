import { requireStoreUser } from "@/lib/auth";
import { plateLookupEnabled } from "@/lib/plate-lookup";
import { storeFeatureNames } from "@/lib/store-features";
import { VehicleForm } from "@/components/VehicleForm";
import { PageHeader } from "@/components/ui";

export default async function NewVehiclePage() {
  const { storeId } = await requireStoreUser();
  return (
    <div>
      <PageHeader back={{ href: "/painel/veiculos", label: "Veículos" }} title="Novo veículo" subtitle="Preencha o anúncio. Fotos, documentação e custos podem ser completados depois." />
      <VehicleForm plateLookupEnabled={plateLookupEnabled()} storeFeatures={await storeFeatureNames(storeId)} />
    </div>
  );
}
