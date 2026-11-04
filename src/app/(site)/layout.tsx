import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav className="flex items-center gap-1 text-sm sm:gap-3">
            <Link href="/veiculos" className="rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
              Comprar
            </Link>
            {user ? (
              <Link href={user.role === "SUPER_ADMIN" ? "/admin" : "/painel"} className="btn-primary">
                Meu painel
              </Link>
            ) : (
              <>
                <Link href="/cadastro-loja" className="hidden rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100 sm:block">
                  Sou lojista
                </Link>
                <Link href="/entrar" className="btn-secondary">Entrar</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <div className="flex gap-4">
            <Link href="/veiculos" className="hover:text-slate-800">Veículos</Link>
            <Link href="/cadastro-loja" className="hover:text-slate-800">Anuncie sua loja</Link>
          </div>
          <p>© {new Date().getFullYear()} SisGarage</p>
        </div>
      </footer>
    </div>
  );
}
