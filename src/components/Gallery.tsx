"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { VehiclePhoto } from "./VehiclePhoto";

type Photo = { id: string; url: string; thumbUrl: string };

/** Galeria com setas, miniaturas, deslizar com o dedo e tela cheia (teclado: ← → Esc). */
export function Gallery({ photos, alt }: { photos: Photo[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [full, setFull] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = photos.length;
  const go = useCallback((d: number) => setIndex((i) => (i + d + count) % count), [count]);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [full, go]);

  if (count === 0) {
    return (
      <div className="card aspect-[4/3] overflow-hidden bg-slate-100">
        <VehiclePhoto alt={alt} />
      </div>
    );
  }
  const current = photos[Math.min(index, count - 1)];
  const swipe = {
    onTouchStart: (e: React.TouchEvent) => (touchX.current = e.touches[0].clientX),
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      touchX.current = null;
    },
  };
  const arrows = (big: boolean) =>
    count > 1 && (
      <>
        <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Foto anterior"
          className={`absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70 ${big ? "px-4 py-3 text-2xl" : "px-3 py-2"}`}>‹</button>
        <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Próxima foto"
          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70 ${big ? "px-4 py-3 text-2xl" : "px-3 py-2"}`}>›</button>
      </>
    );

  return (
    <div className="space-y-2">
      <div className="card relative aspect-[4/3] overflow-hidden bg-slate-900" {...swipe}>
        <button type="button" onClick={() => setFull(true)} className="h-full w-full cursor-zoom-in" aria-label="Ver em tela cheia">
          <img src={current.url} alt={`${alt} — foto ${index + 1}`} className="h-full w-full object-contain" />
        </button>
        {arrows(false)}
        <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
          {index + 1}/{count}
        </span>
      </div>
      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button key={p.id} type="button" onClick={() => setIndex(i)} aria-label={`Ver foto ${i + 1}`}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${i === index ? "border-brand-500" : "border-transparent opacity-70"}`}>
              <img src={p.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {full && (
        <div role="dialog" aria-modal="true" aria-label="Fotos em tela cheia" className="fixed inset-0 z-50 flex items-center justify-center bg-black/95" onClick={() => setFull(false)} {...swipe}>
          <img src={current.url} alt={`${alt} — foto ${index + 1}`} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
          {arrows(true)}
          <button type="button" onClick={() => setFull(false)} aria-label="Fechar"
            className="absolute right-3 top-3 rounded-full bg-white/15 px-3 py-1 text-2xl text-white hover:bg-white/30">×</button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">{index + 1}/{count}</span>
        </div>
      )}
    </div>
  );
}
