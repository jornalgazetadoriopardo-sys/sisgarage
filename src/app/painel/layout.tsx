import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PanelShell } from "@/components/PanelShell";
import type { NavItem } from "@/components/PanelNav";
import { stopActing } from "@/app/actions/admin";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, store, isOwner, asAdmin } = await requireStoreUser();
  const [unread, requests] = await Promise.all([
    prisma.lead.count({ where: { storeId: store.id, read: false } }),
    prisma.appointment.count({ where: { storeId: store.id, status: "REQUESTED" } }),
  ]);

  const nav: NavItem[] = [
    { href: "/painel", label: "Início", icon: "home", group: "Loja" },
    { href: "/painel/veiculos", label: "Veículos", icon: "car", group: "Loja" },
    { href: "/painel/agenda", label: "Agenda", icon: "calendar", badge: requests, group: "Loja" },
    { href: "/painel/contatos", label: "Contatos", icon: "message", badge: unread, group: "Loja" },
    { href: "/painel/vendas", label: "Vendas", icon: "receipt", group: "Loja" },
    { href: "/painel/clientes", label: "Clientes", icon: "customer", group: "Loja" },
    ...(isOwner ? ([{ href: "/painel/financeiro", label: "Financeiro", icon: "wallet", group: "Loja" }] satisfies NavItem[]) : []),
    { href: "/painel/fipe", label: "Tabela FIPE", icon: "gauge", group: "Loja" },
    ...(isOwner
      ? ([
          { href: "/painel/loja", label: "Dados da loja", icon: "store", group: "Configurações" },
          { href: "/painel/usuarios", label: "Usuários", icon: "users", group: "Configurações" },
        ] satisfies NavItem[])
      : []),
    ...(!asAdmin ? ([{ href: "/painel/conta", label: "Minha senha", icon: "key", group: "Configurações" }] satisfies NavItem[]) : []),
  ];

  const banners: React.ReactNode[] = [];
  if (asAdmin) {
    banners.push(
      <div key="admin" className="bg-violet-600 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            Você está no painel de <strong>{store.name}</strong> como administrador. As alterações ficam registradas.
          </p>
          <form action={stopActing}>
            <button className="btn bg-white/15 py-1.5 text-white hover:bg-white/25">Voltar ao admin</button>
          </form>
        </div>
      </div>,
    );
  }
  if (store.status !== "ACTIVE") {
    const pending = store.status === "PENDING";
    banners.push(
      <div key="status" className={pending ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-800"}>
        <p className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-3 text-sm sm:px-6 lg:px-10">
          {pending ? <Clock className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>
            <strong>{pending ? "Loja aguardando aprovação." : "Loja suspensa."}</strong>{" "}
            {pending
              ? "Os veículos aparecem no site assim que a loja for aprovada. Enquanto isso, cadastre o estoque."
              : "Os anúncios não estão visíveis. Entre em contato com o suporte."}
            {pending && asAdmin && <> <Link href="/admin" className="underline">Aprovar no admin</Link></>}
          </span>
        </p>
      </div>,
    );
  }

  return (
    <PanelShell
      nav={nav}
      primary={["/painel", "/painel/veiculos", "/painel/agenda", "/painel/contatos"]}
      newHref="/painel/veiculos/novo"
      title={store.name}
      subtitle={`${store.city}/${store.state}`}
      logoUrl={store.logoUrl}
      userName={user.name}
      publicHref={store.status === "ACTIVE" ? `/lojas/${store.slug}` : undefined}
      banner={banners.length ? <>{banners}</> : undefined}
    >
      {children}
    </PanelShell>
  );
}
