"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { VehiclePhoto } from "./VehiclePhoto";

export function Gallery({ photos, alt }: { photos: { id: string; url: string }[]; alt: string }) {
  const [index, setIndex] = useState(0);
  if (photos.length === 0) {
    return (
      <div className="card aspect-[4/3] overflow-hidden bg-slate-100">
        <VehiclePhoto alt={alt} />
      </div>
    );
  }
  const current = photos[Math.min(index, photos.length - 1)];
  const go = (d: number) => setIndex((i) => (i + d + photos.length) % photos.length);
  return (
    <div className="space-y-2">
      <div className="card relative aspect-[4/3] overflow-hidden bg-slate-900">
        <img src={current.url} alt={`${alt} — foto ${index + 1}`} className="h-full w-full object-contain" />
        {photos.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Foto anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white hover:bg-black/70">‹</button>
            <button type="button" onClick={() => go(1)} aria-label="Próxima foto"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white hover:bg-black/70">›</button>
            <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
              {index + 1}/{photos.length}
            </span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button key={p.id} type="button" onClick={() => setIndex(i)} aria-label={`Ver foto ${i + 1}`}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${i === index ? "border-brand-500" : "border-transparent opacity-70"}`}>
              <img src={p.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
