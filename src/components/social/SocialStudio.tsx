"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { Car, Check, Copy, Download, Loader2, Megaphone, Share2 } from "lucide-react";
import { FORMATS, INSTITUTIONAL_TEMPLATES, VEHICLE_TEMPLATES, type PostFormat } from "@/lib/social/templates";

export type StudioVehicle = {
  id: string; title: string; brand: string; model: string; year: string; km: string; transmission: string | null; fuel: string;
  price: string; previousPrice: string | null; features: string[]; thumbs: string[]; sold: boolean; link: string;
};
export type StudioStore = { name: string; city: string; phone: string | null; instagram: string | null; hours: string | null; site: string };

const tag = (s: string) => `#${s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;

function vehicleCaption(tpl: string, v: StudioVehicle, st: StudioStore) {
  const specs = [v.year, v.km, v.transmission, v.fuel].filter(Boolean).join(" · ");
  const feats = v.features.slice(0, 6).map((f) => `✔️ ${f}`).join("\n");
  const contact = `📍 ${st.name} – ${st.city}${st.phone ? `\n📲 WhatsApp: ${st.phone}` : ""}\n🔗 ${v.link}`;
  const tags = ["#seminovos", "#carros", tag(v.brand), tag(v.model), tag(st.city.split("/")[0]), tag(st.name)].join(" ");
  switch (tpl) {
    case "oferta":
      return `🔥 OFERTA IMPERDÍVEL!\n\n🚗 ${v.title} ${v.year}\n${specs}\n\n${v.previousPrice ? `De ${v.previousPrice}\n` : ""}💰 Por ${v.price}\n\nCorre que é por tempo limitado!\n\n${contact}\n\n${tags} #oferta`;
    case "chegou":
      return `🆕 ACABOU DE CHEGAR!\n\n🚗 ${v.title} ${v.year}\n${specs}\n💰 ${v.price}\n\nVenha conhecer de perto e agende seu test drive.\n\n${contact}\n\n${tags} #novidade`;
    case "detalhes":
      return `🚗 ${v.title} ${v.year}\n${specs}\n\n${feats || "Veículo revisado e pronto para você."}\n\n💰 ${v.price}\n\n${contact}\n\n${tags}`;
    case "vendido":
      return `🎉 VENDIDO!\n\nMais um ${v.title} entregue com sucesso. Obrigado pela confiança!\n\nProcurando o seu? Fale com a gente.\n${st.phone ? `📲 WhatsApp: ${st.phone}\n` : ""}🔗 ${st.site}\n\n${tags} #vendido #clientesatisfeito`;
    default:
      return `🚗 ${v.title} ${v.year}\n${specs}\n${feats ? `\n${feats}\n` : ""}\n💰 ${v.price}\n\n${contact}\n\n${tags}`;
  }
}

function institutionalCaption(tpl: string, title: string, text: string, st: StudioStore) {
  const body = tpl === "horario" ? (st.hours ?? "") : text;
  const tags = ["#seminovos", "#carros", tag(st.city.split("/")[0]), tag(st.name)].join(" ");
  return `${title}\n\n${body ? `${body}\n\n` : ""}📍 ${st.name} – ${st.city}${st.phone ? `\n📲 WhatsApp: ${st.phone}` : ""}${st.instagram ? `\n📷 @${st.instagram}` : ""}\n🔗 ${st.site}\n\n${tags}`;
}

export function SocialStudio({ vehicles, store, presetVehicleId }: { vehicles: StudioVehicle[]; store: StudioStore; presetVehicleId?: string }) {
  const [kind, setKind] = useState<"veiculo" | "inst">(vehicles.length ? "veiculo" : "inst");
  const [vehicleId, setVehicleId] = useState(presetVehicleId ?? vehicles.find((v) => !v.sold)?.id ?? vehicles[0]?.id ?? "");
  const [photo, setPhoto] = useState(0);
  const [vtpl, setVtpl] = useState<keyof typeof VEHICLE_TEMPLATES>("destaque");
  const [itpl, setItpl] = useState<keyof typeof INSTITUTIONAL_TEMPLATES>("aviso");
  const [fmt, setFmt] = useState<PostFormat>("feed");
  const [title, setTitle] = useState<string>(INSTITUTIONAL_TEMPLATES.aviso.title);
  const [text, setText] = useState<string>(INSTITUTIONAL_TEMPLATES.aviso.text);
  const [debounced, setDebounced] = useState({ title, text });
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  useEffect(() => {
    const t = setTimeout(() => setDebounced({ title, text }), 500);
    return () => clearTimeout(t);
  }, [title, text]);
  useEffect(() => setPhoto(0), [vehicleId]);
  useEffect(() => {
    if (vehicle?.sold) setVtpl("vendido");
  }, [vehicle?.sold]);

  const url = useMemo(() => {
    const p = new URLSearchParams({ fmt });
    if (kind === "inst") {
      p.set("kind", "inst");
      p.set("tpl", itpl);
      p.set("title", debounced.title);
      p.set("text", debounced.text);
    } else {
      p.set("tpl", vtpl);
      p.set("v", vehicleId);
      p.set("foto", String(photo));
    }
    return `/painel/social/imagem?${p}`;
  }, [kind, itpl, vtpl, vehicleId, photo, fmt, debounced]);

  useEffect(() => setLoading(true), [url]);
  useEffect(() => {
    setCaption(kind === "inst" ? institutionalCaption(itpl, debounced.title, debounced.text, store) : vehicle ? vehicleCaption(vtpl, vehicle, store) : "");
  }, [kind, itpl, vtpl, vehicle, debounced, store]);

  async function copy() {
    await navigator.clipboard.writeText(caption).catch(() => undefined);
    setMsg("Legenda copiada.");
  }

  async function share() {
    setSharing(true);
    setMsg(null);
    try {
      await navigator.clipboard.writeText(caption).catch(() => undefined);
      const blob = await fetch(url).then((r) => r.blob());
      const file = new File([blob], "post.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: caption });
        setMsg("Legenda copiada: se o app não colar sozinho, é só colar no campo de texto.");
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "post.png";
        a.click();
        setMsg("Imagem baixada e legenda copiada. Publique pelo Instagram/Facebook no computador ou envie para o celular.");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setMsg("Não foi possível compartilhar. Tente baixar a imagem.");
    } finally {
      setSharing(false);
    }
  }

  const { w, h } = FORMATS[fmt];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          {([["veiculo", Car, "Post de veículo"], ["inst", Megaphone, "Post institucional"]] as const).map(([k, Icon, label]) => (
            <button key={k} type="button" onClick={() => setKind(k)} disabled={k === "veiculo" && !vehicles.length}
              className={`card flex items-center gap-3 p-4 text-left font-semibold ${kind === k ? "border-brand-500 ring-4 ring-brand-100" : ""}`}>
              <Icon className={`h-5 w-5 ${kind === k ? "text-brand-600" : "text-slate-400"}`} /> {label}
            </button>
          ))}
        </div>

        {kind === "veiculo" && vehicle && (
          <section className="card space-y-5 p-5 sm:p-6">
            <div>
              <label className="label" htmlFor="sv">Veículo</label>
              <select id="sv" className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.title} {v.year}{v.sold ? " (vendido)" : ""}</option>)}
              </select>
            </div>
            {vehicle.thumbs.length > 1 && (
              <div>
                <span className="label">Foto</span>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {vehicle.thumbs.map((t, i) => (
                    <button key={t} type="button" onClick={() => setPhoto(i)} className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${photo === i ? "border-brand-500" : "border-transparent opacity-70"}`}>
                      <img src={t} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <span className="label">Modelo</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(VEHICLE_TEMPLATES).map(([k, t]) => (
                  <button key={k} type="button" onClick={() => setVtpl(k as keyof typeof VEHICLE_TEMPLATES)}
                    className={`rounded-xl border p-3 text-left ${vtpl === k ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"}`}>
                    <p className="text-sm font-semibold text-slate-800">{t.label}</p>
                    <p className="text-xs text-slate-500">{t.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {kind === "inst" && (
          <section className="card space-y-5 p-5 sm:p-6">
            <div>
              <span className="label">Modelo</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(INSTITUTIONAL_TEMPLATES).map(([k, t]) => (
                  <button key={k} type="button" onClick={() => { setItpl(k as keyof typeof INSTITUTIONAL_TEMPLATES); setTitle(t.title); setText(t.text); }}
                    className={`rounded-xl border p-3 text-left ${itpl === k ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"}`}>
                    <p className="text-sm font-semibold text-slate-800">{t.label}</p>
                    <p className="text-xs text-slate-500">{t.hint}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="st">Título</label>
              <input id="st" className="input" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            {itpl !== "horario" ? (
              <div>
                <label className="label" htmlFor="sx">Texto</label>
                <textarea id="sx" className="input" rows={3} maxLength={220} value={text} onChange={(e) => setText(e.target.value)} />
              </div>
            ) : (
              <p className="text-sm text-slate-500">O horário vem de <strong>Dados da loja</strong>{store.hours ? `: ${store.hours}` : " (ainda não preenchido)"}.</p>
            )}
          </section>
        )}

        <section className="card space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <label className="label mb-0" htmlFor="cap">Legenda</label>
            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={copy}><Copy className="h-3.5 w-3.5" /> Copiar</button>
          </div>
          <textarea id="cap" className="input font-mono text-xs leading-relaxed" rows={12} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="flex gap-1 rounded-2xl bg-slate-200/60 p-1">
          {Object.entries(FORMATS).map(([k, f]) => (
            <button key={k} type="button" onClick={() => setFmt(k as PostFormat)}
              className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold ${fmt === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{f.label}</button>
          ))}
        </div>
        <div className="relative mx-auto overflow-hidden rounded-2xl bg-slate-200 shadow-lg" style={{ aspectRatio: `${w} / ${h}`, maxHeight: "70vh" }}>
          <img key={url} src={url} alt="Prévia do post" className="h-full w-full object-contain" onLoad={() => setLoading(false)} onError={() => setLoading(false)} />
          {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/60"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a href={`${url}&dl=1`} className="btn-secondary"><Download className="h-4 w-4" /> Baixar</a>
          <button type="button" className="btn-primary" onClick={share} disabled={sharing}>
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} Compartilhar
          </button>
        </div>
        {msg && <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {msg}</p>}
        <p className="text-xs text-slate-500">
          No celular, “Compartilhar” abre o Instagram, Facebook ou WhatsApp com a imagem; a legenda já fica copiada para colar.
          A publicação automática direto nas redes depende da conexão com a Meta (próxima fase).
        </p>
      </aside>
    </div>
  );
}
