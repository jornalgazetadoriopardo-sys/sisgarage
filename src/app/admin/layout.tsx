import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/auth";
import { PanelShell } from "@/components/PanelShell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();
  return (
    <PanelShell
      nav={[
        { href: "/admin", label: "Lojas", icon: "building", group: "Plataforma" },
        { href: "/admin/conta", label: "Minha senha", icon: "key", group: "Conta" },
      ]}
      primary={["/admin", "/admin/conta"]}
      title="Administração"
      subtitle="Plataforma SisGarage"
      userName={user.name}
    >
      {children}
    </PanelShell>
  );
}
