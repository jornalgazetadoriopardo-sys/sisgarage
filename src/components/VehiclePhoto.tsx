/* eslint-disable @next/next/no-img-element */
export function VehiclePhoto({ url, alt, className = "" }: { url?: string | null; alt: string; className?: string }) {
  if (!url) {
    return (
      <div className={`flex h-full w-full items-center justify-center text-slate-400 ${className}`}>
        <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path d="M3 13l2-5a2 2 0 011.9-1.4h10.2A2 2 0 0119 8l2 5v4a1 1 0 01-1 1h-1a2 2 0 01-4 0H9a2 2 0 01-4 0H4a1 1 0 01-1-1v-4z" />
          <path d="M3 13h18" />
        </svg>
        <span className="sr-only">Sem foto</span>
      </div>
    );
  }
  return <img src={url} alt={alt} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
}
