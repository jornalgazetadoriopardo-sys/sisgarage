import type { Metadata } from "next";
import { searchVehicles, publicBrands, type VehicleSearch } from "@/lib/vehicles";
import { VehicleCard } from "@/components/VehicleCard";
import { SearchFilters } from "@/components/SearchFilters";
import { Pagination } from "@/components/Pagination";
import { SortSelect } from "@/components/SortSelect";

export const metadata: Metadata = { title: "Veículos à venda" };

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<VehicleSearch> }) {
  const params = await searchParams;
  const [result, brands] = await Promise.all([searchVehicles(params), publicBrands()]);
  const title = params.marca ? `${params.marca} à venda` : "Veículos à venda";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-slate-500">{result.total} veículo(s) encontrado(s)</p>
        </div>
        <SortSelect value={params.ordem} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside>
          <details className="lg:hidden" open={false}>
            <summary className="btn-secondary mb-3 w-full">Filtros</summary>
            <SearchFilters values={params} brands={brands} />
          </details>
          <div className="hidden lg:block">
            <SearchFilters values={params} brands={brands} />
          </div>
        </aside>
        <section>
          {result.items.length === 0 ? (
            <p className="card p-10 text-center text-slate-500">Nenhum veículo encontrado com esses filtros.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
            </div>
          )}
          <Pagination page={result.page} pages={result.pages} basePath="/veiculos" params={{ ...params }} />
        </section>
      </div>
    </div>
  );
}
