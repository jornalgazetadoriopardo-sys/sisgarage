import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/auth";
import { PanelShell } from "@/components/PanelShell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();
  return (
    <PanelShell title="Administração da plataforma" userName={user.name} nav={[{ href: "/admin", label: "Lojas" }, { href: "/admin/conta", label: "Minha senha" }]}>
      {children}
    </PanelShell>
  );
}
