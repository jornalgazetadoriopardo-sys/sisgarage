import Link from "next/link";
import { ChevronRight, Plus, Search, UserRound } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDocument } from "@/lib/br-docs";
import { formatPhone, onlyDigits } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { storeId } = await requireStoreUser();
  const { q } = await searchParams;
  const term = q?.trim();
  const where: Prisma.CustomerWhereInput = { storeId };
  if (term) {
    const digits = onlyDigits(term);
    where.OR = [{ name: { contains: term } }, ...(digits.length >= 3 ? [{ document: { contains: digits } }, { phone: { contains: digits } }] : [])];
  }
  const customers = await prisma.customer.findMany({
    where,
    orderBy: { name: "asc" },
    take: 200,
    include: { _count: { select: { sales: { where: { status: { not: "CANCELED" } } } } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        subtitle="Compradores da loja. O cadastro completo (CPF e endereço) é usado nos contratos."
        actions={<Link href="/painel/clientes/novo" className="btn-primary"><Plus className="h-4 w-4" /> Novo cliente</Link>}
      />
      <form className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input name="q" defaultValue={q} placeholder="Buscar por nome, CPF ou telefone" className="input py-3 pl-10" />
      </form>
      {customers.length === 0 ? (
        <div className="card">
          <EmptyState icon={UserRound} title={term ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            text={term ? "Tente outra busca." : "Cadastre aqui ou transforme um contato do site em cliente."}
            action={!term && <Link href="/painel/clientes/novo" className="btn-primary"><Plus className="h-4 w-4" /> Novo cliente</Link>} />
        </div>
      ) : (
        <ul className="card divide-y divide-slate-100">
          {customers.map((c) => (
            <li key={c.id}>
              <Link href={`/painel/clientes/${c.id}`} className="flex items-center gap-4 p-4 hover:bg-slate-50 sm:p-5">
                <span className="icon-box h-11 w-11 bg-slate-100 text-base font-semibold text-slate-600">{c.name.charAt(0).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{c.name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {[c.document ? formatDocument(c.document) : null, c.phone ? formatPhone(c.phone) : null, c.city].filter(Boolean).join(" · ") || "Cadastro incompleto"}
                  </p>
                </div>
                {c._count.sales > 0 && <span className="badge bg-emerald-50 text-emerald-700">{c._count.sales} compra(s)</span>}
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
