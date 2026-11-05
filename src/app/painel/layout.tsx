import type { Metadata } from "next";
import Link from "next/link";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PanelShell } from "@/components/PanelShell";
import { storeStatusLabels } from "@/lib/labels";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, store } = await requireStoreUser();
  const unread = await prisma.lead.count({ where: { storeId: store.id, read: false } });
  const isOwner = user.role === "STORE_OWNER";

  const nav = [
    { href: "/painel", label: "Início" },
    { href: "/painel/veiculos", label: "Veículos" },
    { href: "/painel/contatos", label: "Contatos", badge: unread },
    ...(isOwner
      ? [
          { href: "/painel/loja", label: "Dados da loja" },
          { href: "/painel/usuarios", label: "Usuários" },
        ]
      : []),
    { href: "/painel/conta", label: "Minha senha" },
  ];

  const banner =
    store.status !== "ACTIVE" ? (
      <div className={store.status === "PENDING" ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-800"}>
        <p className="mx-auto max-w-7xl px-4 py-2 text-sm">
          <strong>{storeStatusLabels[store.status]}.</strong>{" "}
          {store.status === "PENDING"
            ? "Seus veículos aparecerão no site assim que a loja for aprovada. Enquanto isso, cadastre o estoque."
            : "Seus anúncios não estão visíveis. Entre em contato com o suporte."}
        </p>
      </div>
    ) : (
      <div className="bg-brand-50">
        <p className="mx-auto max-w-7xl px-4 py-2 text-sm text-brand-700">
          Sua vitrine: <Link className="font-semibold underline" href={`/lojas/${store.slug}`} target="_blank" rel="noopener">/lojas/{store.slug}</Link>
        </p>
      </div>
    );

  return (
    <PanelShell title={store.name} subtitle={`${store.city}/${store.state}`} userName={user.name} nav={nav} banner={banner}>
      {children}
    </PanelShell>
  );
}
