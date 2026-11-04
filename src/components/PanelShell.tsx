import { logout } from "@/app/actions/auth";
import { Logo } from "./Logo";
import { PanelNav } from "./PanelNav";

export function PanelShell({
  title,
  subtitle,
  userName,
  nav,
  banner,
  children,
}: {
  title: string;
  subtitle?: string;
  userName: string;
  nav: { href: string; label: string; badge?: number }[];
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-4">
            <Logo href={nav[0].href} />
            <div className="hidden min-w-0 border-l border-slate-200 pl-4 sm:block">
              <p className="truncate text-sm font-semibold">{title}</p>
              {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-600 md:inline">{userName}</span>
            <form action={logout}>
              <button className="btn-secondary">Sair</button>
            </form>
          </div>
        </div>
      </header>
      {banner}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <PanelNav items={nav} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
