"use client";
import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
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
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
        over ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50 hover:border-brand-500"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <span className="icon-box mb-1 h-12 w-12 bg-brand-50 text-brand-600"><ImagePlus className="h-6 w-6" /></span>
      <p className="font-semibold text-slate-700">Arraste as fotos aqui ou toque para escolher</p>
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
