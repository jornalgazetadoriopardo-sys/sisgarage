import Link from "next/link";

export function Pagination({
  page,
  pages,
  basePath,
  params,
}: {
  page: number;
  pages: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "pagina") sp.set(k, v);
    if (p > 1) sp.set("pagina", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Paginação">
      {page > 1 && <Link className="btn-secondary" href={href(page - 1)}>Anterior</Link>}
      <span className="px-3 text-sm text-slate-600">Página {page} de {pages}</span>
      {page < pages && <Link className="btn-secondary" href={href(page + 1)}>Próxima</Link>}
    </nav>
  );
}
