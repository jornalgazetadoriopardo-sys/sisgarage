"use client";
import { useRef, useState } from "react";
import { isImageFile } from "@/lib/photo-queue";

export function PhotoDropzone({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) onFiles(Array.from(e.dataTransfer.files).filter(isImageFile));
      }}
      onClick={() => !disabled && input.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
        over ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50 hover:border-brand-500"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <p className="font-semibold text-slate-700">Arraste as fotos aqui ou clique para escolher</p>
      <p className="text-xs text-slate-500">JPG, PNG, WEBP ou HEIC, até 12 MB. No celular, abre a câmera ou a galeria.</p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []).filter(isImageFile));
          e.target.value = "";
        }}
      />
    </div>
  );
}
