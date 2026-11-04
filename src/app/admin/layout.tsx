import { requireSuperAdmin } from "@/lib/auth";
import { PanelShell } from "@/components/PanelShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();
  return (
    <PanelShell title="Administração da plataforma" userName={user.name} nav={[{ href: "/admin", label: "Lojas" }]}>
      {children}
    </PanelShell>
  );
}
