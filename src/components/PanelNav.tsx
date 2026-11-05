"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Boxes, Building2, CalendarDays, Car, Gauge, Home, KeyRound, Megaphone, Menu, ReceiptText, UserRound, Wallet, MessageSquare, Plus, Store, Users, X,
  type LucideIcon,
} from "lucide-react";

const ICONS = { home: Home, car: Car, message: MessageSquare, store: Store, users: Users, key: KeyRound, building: Building2, gauge: Gauge, receipt: ReceiptText, customer: UserRound, calendar: CalendarDays, wallet: Wallet, boxes: Boxes, megaphone: Megaphone } satisfies Record<string, LucideIcon>;
export type NavIcon = keyof typeof ICONS;
export type NavItem = { href: string; label: string; icon: NavIcon; badge?: number; group?: string };

function isActive(pathname: string, href: string, root: string) {
  return href === root ? pathname === root : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const Icon = ICONS[item.icon];
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? "text-brand-600" : "text-slate-400"}`} aria-hidden />
      <span className="flex-1">{item.label}</span>
      {item.badge ? <span className="badge bg-brand-600 text-white">{item.badge}</span> : null}
    </Link>
  );
}

function Groups({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  const root = items[0]?.href ?? "/";
  const groups = [...new Set(items.map((i) => i.group ?? ""))];
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g} className="space-y-1">
          {g && <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{g}</p>}
          {items.filter((i) => (i.group ?? "") === g).map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href, root)} onClick={onNavigate} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Sidebar({ items, header, footer }: { items: NavItem[]; header: React.ReactNode; footer: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="border-b border-slate-100 p-5">{header}</div>
      <nav className="flex-1 overflow-y-auto p-4">
        <Groups items={items} pathname={pathname} />
      </nav>
      <div className="border-t border-slate-100 p-4">{footer}</div>
    </aside>
  );
}

/** Celular: barra inferior com os atalhos principais + menu completo em gaveta. */
export function MobileNav({
  items,
  primary,
  newHref,
  header,
  footer,
}: {
  items: NavItem[];
  primary: string[];
  newHref?: string;
  header: React.ReactNode;
  footer: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const root = items[0]?.href ?? "/";
  const main = primary.map((h) => items.find((i) => i.href === h)).filter(Boolean) as NavItem[];
  const half = Math.ceil(main.length / 2);

  const tab = (item: NavItem) => {
    const Icon = ICONS[item.icon];
    const active = isActive(pathname, item.href, root);
    return (
      <Link key={item.href} href={item.href} className={`relative flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium ${active ? "text-brand-600" : "text-slate-500"}`}>
        <Icon className="h-6 w-6" aria-hidden />
        {item.label}
        {item.badge ? <span className="absolute right-[22%] top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" /> : null}
      </Link>
    );
  };

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Navegação principal">
        {main.slice(0, half).map(tab)}
        {newHref && (
          <div className="flex flex-1 items-center justify-center">
            <Link href={newHref} aria-label="Novo veículo" className="-mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
              <Plus className="h-7 w-7" />
            </Link>
          </div>
        )}
        {main.slice(half).map(tab)}
        <button type="button" onClick={() => setOpen(true)} className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-slate-500">
          <Menu className="h-6 w-6" aria-hidden />
          Menu
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[85%] max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
              <div className="min-w-0 flex-1">{header}</div>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost p-2" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4">
              <Groups items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
            </nav>
            <div className="border-t border-slate-100 p-4">{footer}</div>
          </div>
        </div>
      )}
    </>
  );
}

