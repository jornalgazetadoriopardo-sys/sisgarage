import Link from "next/link";
import type { StoreStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { storeStatusLabels } from "@/lib/labels";
import { setStoreStatus } from "@/app/actions/admin";

const colors: Record<StoreStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-green-100 text-green-800",
  SUSPENDED: "bg-red-100 text-red-800",
};

export default async function AdminStores({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = status && status in storeStatusLabels ? (status as StoreStatus) : undefined;
  const [stores, counts, totalVehicles] = await Promise.all([
    prisma.store.findMany({
      where: filter ? { status: filter } : undefined,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        users: { where: { role: "STORE_OWNER" }, select: { name: true, email: true }, take: 1 },
        _count: { select: { vehicles: true, leads: true } },
      },
    }),
    prisma.store.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.vehicle.count(),
  ]);
  const c = (s: StoreStatus) => counts.find((x) => x.status === s)?._count._all ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Lojas</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["PENDING", "ACTIVE", "SUSPENDED"] as StoreStatus[]).map((s) => (
          <Link key={s} href={`/admin?status=${s}`} className={`card p-4 ${filter === s ? "ring-2 ring-brand-500" : ""}`}>
            <p className="text-xs text-slate-500">{storeStatusLabels[s]}</p>
            <p className="text-2xl font-bold">{c(s)}</p>
          </Link>
        ))}
        <Link href="/admin" className="card p-4">
          <p className="text-xs text-slate-500">Veículos cadastrados</p>
          <p className="text-2xl font-bold">{totalVehicles}</p>
        </Link>
      </div>
      {stores.length === 0 ? (
        <p className="card p-10 text-center text-slate-500">Nenhuma loja.</p>
      ) : (
        <ul className="space-y-2">
          {stores.map((s) => (
            <li key={s.id} className="card flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="font-semibold">
                  {s.name} <span className={`badge ml-1 ${colors[s.status]}`}>{storeStatusLabels[s.status]}</span>
                </p>
                <p className="text-sm text-slate-500">
                  {s.city}/{s.state} · {s.cnpj ? `CNPJ ${s.cnpj} · ` : ""}{s.phone ?? ""}
                </p>
                <p className="text-sm text-slate-500">
                  Responsável: {s.users[0]?.name ?? "—"} ({s.users[0]?.email ?? s.email})
                </p>
                <p className="text-xs text-slate-400">
                  Desde {formatDate(s.createdAt)} · {s._count.vehicles} veículo(s) · {s._count.leads} contato(s)
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {s.status === "ACTIVE" && <Link href={`/lojas/${s.slug}`} target="_blank" className="btn-secondary">Vitrine ↗</Link>}
                {s.status !== "ACTIVE" && (
                  <form action={setStoreStatus}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="status" value="ACTIVE" />
                    <button className="btn-primary">{s.status === "PENDING" ? "Aprovar" : "Reativar"}</button>
                  </form>
                )}
                {s.status !== "SUSPENDED" && (
                  <form action={setStoreStatus}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="status" value="SUSPENDED" />
                    <button className="btn-danger">Suspender</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
