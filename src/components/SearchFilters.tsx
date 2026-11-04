import { fuelLabels, transmissionLabels, vehicleTypeLabels, BR_STATES } from "@/lib/labels";
import type { VehicleSearch } from "@/lib/vehicles";

export function SearchFilters({
  values,
  brands,
  action = "/veiculos",
}: {
  values: VehicleSearch;
  brands: { brand: string; count: number }[];
  action?: string;
}) {
  return (
    <form action={action} method="get" className="card space-y-4 p-4">
      <div>
        <label className="label" htmlFor="q">Buscar</label>
        <input id="q" name="q" defaultValue={values.q} placeholder="Ex.: Onix, Corolla XEi" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="marca">Marca</label>
        <select id="marca" name="marca" defaultValue={values.marca ?? ""} className="input">
          <option value="">Todas</option>
          {brands.map((b) => (
            <option key={b.brand} value={b.brand}>{b.brand} ({b.count})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="tipo">Tipo</label>
        <select id="tipo" name="tipo" defaultValue={values.tipo ?? ""} className="input">
          <option value="">Todos</option>
          {Object.entries(vehicleTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="label">Preço (R$)</legend>
        <input name="precoMin" defaultValue={values.precoMin} inputMode="numeric" placeholder="Mín." className="input" aria-label="Preço mínimo" />
        <input name="precoMax" defaultValue={values.precoMax} inputMode="numeric" placeholder="Máx." className="input" aria-label="Preço máximo" />
      </fieldset>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="label">Ano do modelo</legend>
        <input name="anoMin" defaultValue={values.anoMin} inputMode="numeric" placeholder="De" className="input" aria-label="Ano mínimo" />
        <input name="anoMax" defaultValue={values.anoMax} inputMode="numeric" placeholder="Até" className="input" aria-label="Ano máximo" />
      </fieldset>
      <div>
        <label className="label" htmlFor="kmMax">Km máxima</label>
        <input id="kmMax" name="kmMax" defaultValue={values.kmMax} inputMode="numeric" placeholder="Ex.: 80000" className="input" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="cambio">Câmbio</label>
          <select id="cambio" name="cambio" defaultValue={values.cambio ?? ""} className="input">
            <option value="">Todos</option>
            {Object.entries(transmissionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="combustivel">Combustível</label>
          <select id="combustivel" name="combustivel" defaultValue={values.combustivel ?? ""} className="input">
            <option value="">Todos</option>
            {Object.entries(fuelLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="label" htmlFor="cidade">Cidade</label>
          <input id="cidade" name="cidade" defaultValue={values.cidade} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="uf">UF</label>
          <select id="uf" name="uf" defaultValue={values.uf ?? ""} className="input">
            <option value="">--</option>
            {BR_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {values.ordem && <input type="hidden" name="ordem" value={values.ordem} />}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1">Filtrar</button>
        <a href={action} className="btn-secondary">Limpar</a>
      </div>
    </form>
  );
}
