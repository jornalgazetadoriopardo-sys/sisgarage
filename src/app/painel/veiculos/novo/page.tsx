import Link from "next/link";
import { requireStoreUser } from "@/lib/auth";
import { plateLookupEnabled } from "@/lib/plate-lookup";
import { VehicleForm } from "@/components/VehicleForm";

export default async function NewVehiclePage() {
  await requireStoreUser();
  return (
    <div className="space-y-4">
      <Link href="/painel/veiculos" className="text-sm text-slate-500 hover:underline">← Veículos</Link>
      <h1 className="text-2xl font-bold">Novo veículo</h1>
      <VehicleForm plateLookupEnabled={plateLookupEnabled()} />
    </div>
  );
}
