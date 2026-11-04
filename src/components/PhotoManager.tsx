"use client";
/* eslint-disable @next/next/no-img-element */
import { useActionState, useTransition } from "react";
import { deleteVehiclePhoto, moveVehiclePhoto, uploadVehiclePhotos } from "@/app/actions/vehicles";
import { initialState } from "@/lib/action-state";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function PhotoManager({ vehicleId, photos }: { vehicleId: string; photos: { id: string; url: string }[] }) {
  const [state, action] = useActionState(uploadVehiclePhotos, initialState);
  const [pending, start] = useTransition();

  return (
    <section className="card space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Fotos ({photos.length})</h2>
        {pending && <span className="text-xs text-slate-500">Atualizando...</span>}
      </div>
      {photos.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma foto ainda. Veículos com fotos vendem muito mais.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="relative aspect-[4/3] bg-slate-100">
                <img src={p.url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 && <span className="badge absolute left-1 top-1 bg-brand-600 text-white">Capa</span>}
              </div>
              <div className="flex items-center justify-between gap-1 p-1 text-xs">
                <div className="flex gap-1">
                  <button type="button" disabled={pending || i === 0} onClick={() => start(() => moveVehiclePhoto(p.id, "left"))}
                    className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Mover para a esquerda">←</button>
                  <button type="button" disabled={pending || i === photos.length - 1} onClick={() => start(() => moveVehiclePhoto(p.id, "right"))}
                    className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Mover para a direita">→</button>
                  {i !== 0 && (
                    <button type="button" disabled={pending} onClick={() => start(() => moveVehiclePhoto(p.id, "first"))}
                      className="rounded px-2 py-1 hover:bg-slate-100">Capa</button>
                  )}
                </div>
                <button type="button" disabled={pending}
                  onClick={() => { if (confirm("Excluir esta foto?")) start(() => deleteVehiclePhoto(p.id)); }}
                  className="rounded px-2 py-1 text-red-600 hover:bg-red-50">Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input type="hidden" name="id" value={vehicleId} />
        <input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required className="input flex-1" />
        <SubmitButton pendingText="Enviando...">Enviar fotos</SubmitButton>
      </form>
      <FormMessage state={state} />
    </section>
  );
}
