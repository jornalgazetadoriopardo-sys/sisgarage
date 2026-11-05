/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Logo } from "./Logo";
import { MobileNav, Sidebar, type NavItem } from "./PanelNav";

export function PanelShell({
  nav,
  primary,
  newHref,
  title,
  subtitle,
  logoUrl,
  userName,
  publicHref,
  banner,
  children,
}: {
  nav: NavItem[];
  primary: string[];
  newHref?: string;
  title: string;
  subtitle?: string;
  logoUrl?: string | null;
  userName: string;
  publicHref?: string;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const identity = (
    <div className="flex items-center gap-3">
      {logoUrl ? (
        <img src={logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
          {title.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{title}</p>
        {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
  const footer = (
    <div className="space-y-1">
      {publicHref && (
        <Link href={publicHref} target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
          <ExternalLink className="h-5 w-5 text-slate-400" /> Ver vitrine no site
        </Link>
      )}
      <form action={logout}>
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
          <LogOut className="h-5 w-5 text-slate-400" /> Sair
          <span className="ml-auto truncate text-xs font-normal text-slate-400">{userName}</span>
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar
        items={nav}
        header={
          <div className="space-y-5">
            <Logo href={nav[0].href} />
            {identity}
          </div>
        }
        footer={footer}
      />
      <div className="min-w-0 flex-1">
        {/* topo no celular */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <Logo href={nav[0].href} />
          <span className="truncate text-sm font-medium text-slate-600">{title}</span>
        </header>
        {banner}
        <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</main>
      </div>
      <MobileNav items={nav} primary={primary} newHref={newHref} header={identity} footer={footer} />
    </div>
  );
}
