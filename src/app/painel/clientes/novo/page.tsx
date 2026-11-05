import { requireStoreUser } from "@/lib/auth";
import { NewCustomer } from "@/components/NewCustomer";
import { PageHeader } from "@/components/ui";

export default async function NewCustomerPage() {
  await requireStoreUser();
  return (
    <div>
      <PageHeader back={{ href: "/painel/clientes", label: "Clientes" }} title="Novo cliente" />
      <div className="card p-5 sm:p-6"><NewCustomer /></div>
    </div>
  );
}
