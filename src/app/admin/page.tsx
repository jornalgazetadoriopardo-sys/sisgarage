/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { StoreStatus } from "@prisma/client";
import { Ban, Building2, Car, CheckCircle2, Clock, ExternalLink, LayoutDashboard, MessageSquare, RotateCcw } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { storeStatusLabels } from "@/lib/labels";
import { actAsStore, setStoreStatus } from "@/app/actions/admin";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";

const chip: Record<StoreStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  SUSPENDED: "bg-red-50 text-red-700",
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
    <div className="space-y-8">
      <PageHeader title="Lojas" subtitle="Aprove novas lojas e acesse o painel de qualquer uma para ajudar no cadastro." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={Clock} tone="amber" label="Aguardando aprovação" value={c("PENDING")} href="/admin?status=PENDING" />
        <StatCard icon={CheckCircle2} tone="green" label="Ativas" value={c("ACTIVE")} href="/admin?status=ACTIVE" />
        <StatCard icon={Ban} tone="red" label="Suspensas" value={c("SUSPENDED")} href="/admin?status=SUSPENDED" />
        <StatCard icon={Car} label="Veículos cadastrados" value={totalVehicles} href="/admin" />
      </div>

      {filter && (
        <p className="text-sm text-slate-500">
          Mostrando: <strong>{storeStatusLabels[filter]}</strong> · <Link href="/admin" className="text-brand-600 hover:underline">ver todas</Link>
        </p>
      )}

      {stores.length === 0 ? (
        <div className="card"><EmptyState icon={Building2} title="Nenhuma loja aqui" /></div>
      ) : (
        <ul className="space-y-4">
          {stores.map((s) => (
            <li key={s.id} className="card p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  {s.logoUrl ? (
                    <img src={s.logoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white">{s.name.charAt(0)}</span>
                  )}
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-900">
                      {s.name} <span className={`badge ${chip[s.status]}`}>{storeStatusLabels[s.status]}</span>
                    </p>
                    <p className="text-sm text-slate-500">{s.city}/{s.state}{s.phone ? ` · ${s.phone}` : ""}{s.cnpj ? ` · CNPJ ${s.cnpj}` : ""}</p>
                    <p className="truncate text-sm text-slate-500">Responsável: {s.users[0]?.name ?? "—"} ({s.users[0]?.email ?? s.email})</p>
                    <p className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-slate-400">
                      <span>Desde {formatDate(s.createdAt)}</span>
                      <span className="inline-flex items-center gap-1"><Car className="h-3.5 w-3.5" /> {s._count.vehicles}</span>
                      <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {s._count.leads}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={actAsStore}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="btn-primary"><LayoutDashboard className="h-4 w-4" /> Acessar painel</button>
                  </form>
                  {s.status === "ACTIVE" && (
                    <Link href={`/lojas/${s.slug}`} target="_blank" className="btn-secondary"><ExternalLink className="h-4 w-4" /> Vitrine</Link>
                  )}
                  {s.status !== "ACTIVE" && (
                    <form action={setStoreStatus}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="status" value="ACTIVE" />
                      <button className="btn border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                        {s.status === "PENDING" ? <><CheckCircle2 className="h-4 w-4" /> Aprovar</> : <><RotateCcw className="h-4 w-4" /> Reativar</>}
                      </button>
                    </form>
                  )}
                  {s.status !== "SUSPENDED" && (
                    <form action={setStoreStatus}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="status" value="SUSPENDED" />
                      <button className="btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700"><Ban className="h-4 w-4" /> Suspender</button>
                    </form>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
