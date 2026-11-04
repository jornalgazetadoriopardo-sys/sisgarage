"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  ["", "Mais relevantes"],
  ["menor-preco", "Menor preço"],
  ["maior-preco", "Maior preço"],
  ["menor-km", "Menor km"],
  ["mais-novo", "Mais novos"],
] as const;

export function SortSelect({ value }: { value?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      Ordenar:
      <select
        className="input w-auto"
        defaultValue={value ?? ""}
        onChange={(e) => {
          const sp = new URLSearchParams(params.toString());
          if (e.target.value) sp.set("ordem", e.target.value);
          else sp.delete("ordem");
          sp.delete("pagina");
          router.push(`${pathname}?${sp.toString()}`);
        }}
      >
        {OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </label>
  );
}
