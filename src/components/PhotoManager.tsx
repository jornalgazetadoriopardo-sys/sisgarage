"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteVehiclePhoto, reorderVehiclePhotos } from "@/app/actions/vehicles";
import { uploadPhotoQueue, type QueueItem } from "@/lib/photo-queue";
import { PhotoDropzone } from "./PhotoDropzone";
import { useSortable } from "./useSortable";

type Photo = { id: string; url: string; thumbUrl: string };

export function PhotoManager({ vehicleId, photos: initial, watermarkOn }: { vehicleId: string; photos: Photo[]; watermarkOn: boolean }) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initial);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [pending, start] = useTransition();
  const uploading = queue.some((q) => q.status === "waiting" || q.status === "sending");

  const persistOrder = (ids: string[]) => {
    setPhotos((prev) => ids.map((id) => prev.find((p) => p.id === id)!).filter(Boolean));
    start(() => reorderVehiclePhotos(vehicleId, ids));
  };
  const listRef = useSortable<HTMLUListElement>(persistOrder, { disabled: uploading });

  async function addFiles(files: File[]) {
    const items = files.map((file, i) => ({ key: `${Date.now()}-${i}`, file }));
    setQueue((q) => [
      ...q.filter((x) => x.status !== "done"),
      ...items.map(({ key, file }) => ({ key, name: file.name, preview: URL.createObjectURL(file), status: "waiting" as const })),
    ]);
    await uploadPhotoQueue(vehicleId, items, (key, patch, photo) => {
      setQueue((q) => q.map((x) => (x.key === key ? { ...x, ...patch } : x)));
      if (photo) setPhotos((p) => [...p, photo]);
    });
    setQueue((q) => q.filter((x) => x.status === "error"));
    router.refresh();
  }

  const makeCover = (id: string) => persistOrder([id, ...photos.filter((p) => p.id !== id).map((p) => p.id)]);
  const remove = (id: string) => {
    if (!confirm("Excluir esta foto?")) return;
    setPhotos((p) => p.filter((x) => x.id !== id));
    start(() => deleteVehiclePhoto(id));
  };

  return (
    <section className="card space-y-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Fotos ({photos.length})</h2>
        <span className="text-xs text-slate-500">
          {pending ? "Salvando..." : "Arraste para mudar a ordem. A primeira é a capa."}
          {watermarkOn && " · Marca d'água ativa"}
        </span>
      </div>
      <ul ref={listRef} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.id} data-id={p.id} className="cursor-grab overflow-hidden rounded-xl border border-slate-200 bg-white active:cursor-grabbing">
            <div className="relative aspect-[4/3] bg-slate-100">
              <img src={p.thumbUrl} alt={`Foto ${i + 1}`} className="pointer-events-none h-full w-full object-cover" />
              {i === 0 && <span className="badge absolute left-1 top-1 bg-brand-600 text-white">Capa</span>}
            </div>
            <div className="flex items-center justify-between gap-1 p-2 text-xs">
              {i !== 0 ? (
                <button type="button" onClick={() => makeCover(p.id)} className="rounded px-2 py-1 hover:bg-slate-100">Tornar capa</button>
              ) : <span />}
              <button type="button" onClick={() => remove(p.id)} className="rounded px-2 py-1 text-red-600 hover:bg-red-50">Excluir</button>
            </div>
          </li>
        ))}
      </ul>
      {queue.length > 0 && <UploadQueue queue={queue} />}
      <PhotoDropzone onFiles={addFiles} disabled={uploading} />
    </section>
  );
}

export function UploadQueue({ queue }: { queue: QueueItem[] }) {
  const done = queue.filter((q) => q.status === "done").length;
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">Enviando fotos: {done} de {queue.length}</p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {queue.map((q) => (
          <li key={q.key} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100" title={q.error ?? q.name}>
            <img src={q.preview} alt="" className="h-full w-full object-cover opacity-70" />
            <span
              className={`absolute inset-x-0 bottom-0 px-1 py-0.5 text-center text-[10px] font-semibold text-white ${
                q.status === "error" ? "bg-red-600" : q.status === "done" ? "bg-green-600" : "bg-slate-700"
              }`}
            >
              {q.status === "waiting" ? "Na fila" : q.status === "sending" ? "Enviando..." : q.status === "done" ? "Pronto" : "Erro"}
            </span>
          </li>
        ))}
      </ul>
      {queue.filter((q) => q.error).map((q) => (
        <p key={q.key} className="text-xs text-red-600">{q.name}: {q.error}</p>
      ))}
    </div>
  );
}
