"use client";
import { useState } from "react";
import { Download, FileText, Loader2, Share2 } from "lucide-react";

type Doc = { kind: string; label: string };

/** Abre, baixa ou compartilha (WhatsApp, e-mail...) os PDFs da venda. */
export function SaleDocuments({ saleId, docs, fileBase }: { saleId: string; docs: Doc[]; fileBase: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const url = (kind: string) => `/painel/vendas/${saleId}/pdf/${kind}`;

  async function share(d: Doc) {
    setBusy(d.kind);
    setMsg(null);
    try {
      const blob = await fetch(url(d.kind)).then((r) => {
        if (!r.ok) throw new Error();
        return r.blob();
      });
      const file = new File([blob], `${d.kind}-${fileBase}.pdf`, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: d.label });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        setMsg("Arquivo baixado. Anexe-o no WhatsApp Web ou no e-mail.");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setMsg("Não foi possível gerar o arquivo. Tente de novo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <ul className="grid gap-3 sm:grid-cols-2">
        {docs.map((d) => (
          <li key={d.kind} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
            <span className="icon-box h-10 w-10 bg-red-50 text-red-600"><FileText className="h-5 w-5" /></span>
            <a href={url(d.kind)} target="_blank" rel="noopener" className="min-w-0 flex-1 font-medium text-slate-800 hover:text-brand-600">{d.label}</a>
            <a href={`${url(d.kind)}?baixar=1`} className="btn-ghost px-2.5" title="Baixar" aria-label={`Baixar ${d.label}`}><Download className="h-4 w-4" /></a>
            <button type="button" onClick={() => share(d)} className="btn-ghost px-2.5" title="Compartilhar (WhatsApp)" aria-label={`Compartilhar ${d.label}`} disabled={busy === d.kind}>
              {busy === d.kind ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            </button>
          </li>
        ))}
      </ul>
      {msg && <p className="text-sm text-slate-500">{msg}</p>}
    </div>
  );
}
