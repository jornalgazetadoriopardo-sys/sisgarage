"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from "react";
import type { Store } from "@prisma/client";
import { reapplyWatermark, updateWatermark } from "@/app/actions/store";
import { watermarkPositionLabels } from "@/lib/labels";
import { useFormAction } from "@/lib/use-form-action";
import type { ActionState } from "@/lib/action-state";
import { FormMessage } from "./FormMessage";

const previewPos: Record<Store["watermarkPosition"], string> = {
  BOTTOM_RIGHT: "bottom-[3%] right-[3%]",
  BOTTOM_LEFT: "bottom-[3%] left-[3%]",
  TOP_RIGHT: "top-[3%] right-[3%]",
  TOP_LEFT: "top-[3%] left-[3%]",
  CENTER: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
};

export function WatermarkForm({ store, photoCount }: { store: Store; photoCount: number }) {
  const { state, onSubmit, pending } = useFormAction(updateWatermark);
  const [position, setPosition] = useState(store.watermarkPosition);
  const [size, setSize] = useState(store.watermarkSize);
  const [opacity, setOpacity] = useState(store.watermarkOpacity);
  const [preview, setPreview] = useState<string | null>(store.watermarkUrl);
  const [reapplyState, setReapplyState] = useState<ActionState>({});
  const [reapplying, startReapply] = useTransition();

  return (
    <div className="card space-y-4 p-6">
      <div>
        <h2 className="text-lg font-bold">Marca d’água nas fotos</h2>
        <p className="text-sm text-slate-500">
          O sistema guarda a foto original, então dá para ligar, trocar ou remover a marca a qualquer momento.
        </p>
      </div>
      <form onSubmit={onSubmit} className="grid gap-6 md:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="enabled" defaultChecked={store.watermarkEnabled} className="h-4 w-4" />
            Aplicar marca d’água nas fotos novas
          </label>
          <div>
            <label className="label" htmlFor="wm-image">Imagem (PNG com fundo transparente)</label>
            <input id="wm-image" name="image" type="file" accept="image/png,image/webp" className="input"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setPreview(URL.createObjectURL(f)); }} />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" name="makeWhite" defaultChecked className="h-4 w-4" />
              Converter para branco (recomendado para logos coloridos)
            </label>
          </div>
          <div>
            <label className="label" htmlFor="wm-position">Posição</label>
            <select id="wm-position" name="position" value={position} onChange={(e) => setPosition(e.target.value as Store["watermarkPosition"])} className="input">
              {Object.entries(watermarkPositionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="wm-size">Tamanho: {size}%</label>
              <input id="wm-size" name="size" type="range" min={5} max={60} value={size} onChange={(e) => setSize(+e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="label" htmlFor="wm-opacity">Opacidade: {opacity}%</label>
              <input id="wm-opacity" name="opacity" type="range" min={10} max={100} value={opacity} onChange={(e) => setOpacity(+e.target.value)} className="w-full" />
            </div>
          </div>
          <FormMessage state={state} />
          <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Salvando..." : "Salvar marca d’água"}</button>
        </div>
        <div>
          <p className="label">Prévia</p>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gradient-to-br from-slate-500 to-slate-800">
            {preview && (
              <img src={preview} alt="" className={`absolute ${previewPos[position]}`}
                style={{ width: `${size}%`, opacity: opacity / 100, filter: "brightness(0) invert(1)" }} />
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">Prévia aproximada (mostrada em branco).</p>
        </div>
      </form>
      <div className="border-t border-slate-200 pt-4">
        <p className="mb-2 text-sm text-slate-600">
          Aplicar a configuração salva nas {photoCount} foto(s) já enviadas (se a marca estiver desligada, ela é removida).
        </p>
        <button type="button" className="btn-secondary" disabled={reapplying || photoCount === 0}
          onClick={() => confirm("Refazer todas as fotos da loja com a configuração atual?") && startReapply(async () => setReapplyState(await reapplyWatermark()))}>
          {reapplying ? "Processando fotos..." : "Aplicar em todas as fotos"}
        </button>
        <div className="mt-2"><FormMessage state={reapplyState} /></div>
      </div>
    </div>
  );
}
