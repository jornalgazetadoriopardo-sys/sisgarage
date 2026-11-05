import { requireStoreUser } from "@/lib/auth";
import { agendaOptions } from "@/lib/agenda";
import { NewLeadForm } from "@/components/crm/LeadForms";
import { PageHeader } from "@/components/ui";

export default async function NewLeadPage() {
  const { storeId } = await requireStoreUser();
  const { vehicles } = await agendaOptions(storeId);
  return (
    <div>
      <PageHeader back={{ href: "/painel/contatos", label: "Contatos" }} title="Novo contato" subtitle="Para quem chegou pelo WhatsApp, telefone, Instagram ou foi direto à loja." />
      <NewLeadForm vehicles={vehicles} />
    </div>
  );
}
