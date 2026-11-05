import Link from "next/link";
import { LayoutDashboard, LogIn, Search, Store } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            <Link href="/veiculos" className="btn-ghost">
              <Search className="h-4 w-4" /> <span className="hidden sm:inline">Buscar veículos</span><span className="sm:hidden">Buscar</span>
            </Link>
            {user ? (
              <Link href={user.role === "SUPER_ADMIN" ? "/admin" : "/painel"} className="btn-primary">
                <LayoutDashboard className="h-4 w-4" /> <span className="hidden sm:inline">Meu painel</span>
              </Link>
            ) : (
              <>
                <Link href="/cadastro-loja" className="btn-ghost hidden md:inline-flex">
                  <Store className="h-4 w-4" /> Anunciar minha loja
                </Link>
                <Link href="/entrar" className="btn-secondary">
                  <LogIn className="h-4 w-4" /> Entrar
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-sm text-slate-500 sm:grid-cols-3 sm:px-6">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-xs">Carros, motos e utilitários das lojas da sua região, com contato direto.</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-slate-800">Comprar</p>
            <Link href="/veiculos" className="block hover:text-slate-800">Todos os veículos</Link>
            <Link href="/veiculos?tipo=CAR" className="block hover:text-slate-800">Carros</Link>
            <Link href="/veiculos?tipo=MOTORCYCLE" className="block hover:text-slate-800">Motos</Link>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-slate-800">Para lojas</p>
            <Link href="/cadastro-loja" className="block hover:text-slate-800">Anunciar minha loja</Link>
            <Link href="/entrar" className="block hover:text-slate-800">Acessar painel</Link>
          </div>
        </div>
        <p className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} SisGarage</p>
      </footer>
    </div>
  );
}
