import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import { readPublicFile } from "../storage";
import { formatPhone } from "../format";
import { FORMATS, type InstitutionalTemplate, type PostFormat, type VehicleTemplate } from "./templates";

/* eslint-disable @next/next/no-img-element -- JSX renderizado como imagem (satori), não é HTML */

let fontsCache: { name: string; data: Buffer; weight: 400 | 600 | 800; style: "normal" }[] | null = null;
async function fonts() {
  if (fontsCache) return fontsCache;
  const dir = path.join(process.cwd(), "assets", "fonts");
  const load = async (w: 400 | 600 | 800) => ({ name: "Inter", data: await readFile(path.join(dir, `inter-latin-${w}-normal.woff`)), weight: w, style: "normal" as const });
  fontsCache = await Promise.all([load(400), load(600), load(800)]);
  return fontsCache;
}

export async function imageDataUrl(url: string | null | undefined, width: number) {
  if (!url) return null;
  try {
    const buf = await sharp(await readPublicFile(url)).resize({ width, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function logoDataUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const buf = await sharp(await readPublicFile(url)).resize(200, 200, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export type BrandData = { name: string; logo: string | null; color: string; whatsapp: string | null; city: string; instagram: string | null; hours: string | null };
export type VehicleData = {
  title: string; subtitle: string; year: string; km: string; transmission: string | null; fuel: string;
  price: string; previousPrice: string | null; features: string[]; badge: string | null; photos: string[];
};

const brl = (v: string) => v;

function hexToRgba(hex: string, a: number) {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return `rgba(29,85,216,${a})`;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
}

function Footer({ b, scale = 1, dark = true }: { b: BrandData; scale?: number; dark?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 * scale, padding: `${26 * scale}px ${48 * scale}px`, background: dark ? b.color : "#ffffff", color: dark ? "#fff" : "#0f172a" }}>
      {b.logo ? (
        <img alt="" src={b.logo} width={64 * scale} height={64 * scale} style={{ borderRadius: 14 * scale, background: "#fff" }} />
      ) : (
        <div style={{ display: "flex", width: 64 * scale, height: 64 * scale, borderRadius: 14 * scale, background: "#fff", color: b.color, fontSize: 36 * scale, fontWeight: 800, alignItems: "center", justifyContent: "center" }}>{b.name.charAt(0)}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontSize: 30 * scale, fontWeight: 800 }}>{b.name}</div>
        <div style={{ fontSize: 22 * scale, opacity: 0.85 }}>{`${b.city}${b.instagram ? `  ·  @${b.instagram}` : ""}`}</div>
      </div>
      {b.whatsapp && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ fontSize: 18 * scale, opacity: 0.85, textTransform: "uppercase", letterSpacing: 2 }}>WhatsApp</div>
          <div style={{ fontSize: 30 * scale, fontWeight: 800 }}>{formatPhone(b.whatsapp)}</div>
        </div>
      )}
    </div>
  );
}

function Photo({ src, w, h }: { src: string | undefined; w: number; h: number }) {
  return src ? (
    <img alt="" src={src} width={w} height={h} style={{ width: w, height: h, objectFit: "cover" }} />
  ) : (
    <div style={{ display: "flex", width: w, height: h, background: "#cbd5e1", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 40 }}>Sem foto</div>
  );
}

function Chips({ items, color, size = 26 }: { items: string[]; color: string; size?: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {items.map((i) => (
        <div key={i} style={{ display: "flex", padding: "8px 18px", borderRadius: 999, background: color, color: "#fff", fontSize: size, fontWeight: 600 }}>{i}</div>
      ))}
    </div>
  );
}

function vehiclePost(tpl: VehicleTemplate, fmt: PostFormat, v: VehicleData, b: BrandData) {
  const { w, h } = FORMATS[fmt];
  const tall = fmt !== "feed";
  const specs = [v.year, v.km, ...(v.transmission ? [v.transmission] : []), v.fuel];

  if (tpl === "oferta") {
    const photoH = Math.round(h * 0.55);
    return (
      <div style={{ display: "flex", flexDirection: "column", width: w, height: h, background: "#0f172a", fontFamily: "Inter" }}>
        <div style={{ display: "flex", position: "relative" }}>
          <Photo src={v.photos[0]} w={w} h={photoH} />
          <div style={{ display: "flex", position: "absolute", top: 40, left: 40, padding: "12px 28px", background: "#f59e0b", color: "#111827", fontSize: 40, fontWeight: 800, borderRadius: 14 }}>OFERTA</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "36px 48px", color: "#fff", gap: 10, justifyContent: "center" }}>
          <div style={{ fontSize: tall ? 60 : 52, fontWeight: 800, lineHeight: 1.05 }}>{v.title}</div>
          <div style={{ fontSize: 28, opacity: 0.8 }}>{specs.join("  ·  ")}</div>
          {v.previousPrice && <div style={{ fontSize: 36, opacity: 0.7, textDecoration: "line-through" }}>{`De ${brl(v.previousPrice)}`}</div>}
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <div style={{ fontSize: 34, fontWeight: 600 }}>{v.previousPrice ? "Por" : "Apenas"}</div>
            <div style={{ fontSize: tall ? 104 : 88, fontWeight: 800, color: "#fbbf24" }}>{brl(v.price)}</div>
          </div>
        </div>
        <Footer b={b} />
      </div>
    );
  }

  if (tpl === "chegou") {
    return (
      <div style={{ display: "flex", flexDirection: "column", width: w, height: h, background: "#fff", fontFamily: "Inter" }}>
        <div style={{ display: "flex", flexDirection: "column", padding: "44px 48px", background: b.color, color: "#fff" }}>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: 6, opacity: 0.9 }}>NOVIDADE NO ESTOQUE</div>
          <div style={{ fontSize: tall ? 92 : 80, fontWeight: 800, lineHeight: 1 }}>Acabou de chegar!</div>
        </div>
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <Photo src={v.photos[0]} w={w} h={Math.round(h * (tall ? 0.5 : 0.42))} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", padding: "28px 48px", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ fontSize: 50, fontWeight: 800, color: "#0f172a", lineHeight: 1.05 }}>{v.title}</div>
              {v.subtitle && <div style={{ fontSize: 28, color: "#475569" }}>{v.subtitle}</div>}
            </div>
            <div style={{ fontSize: 60, fontWeight: 800, color: b.color }}>{brl(v.price)}</div>
          </div>
          <Chips items={specs} color={hexToRgba(b.color, 0.85)} />
        </div>
        <Footer b={b} />
      </div>
    );
  }

  if (tpl === "detalhes") {
    const feats = v.features.slice(0, tall ? 8 : 6);
    return (
      <div style={{ display: "flex", flexDirection: "column", width: w, height: h, background: "#f8fafc", fontFamily: "Inter" }}>
        <Photo src={v.photos[0]} w={w} h={Math.round(h * (tall ? 0.42 : 0.4))} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "36px 48px", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ fontSize: 50, fontWeight: 800, color: "#0f172a", lineHeight: 1.05 }}>{v.title}</div>
              <div style={{ fontSize: 26, color: "#475569" }}>{specs.join("  ·  ")}</div>
            </div>
            <div style={{ fontSize: 56, fontWeight: 800, color: b.color }}>{brl(v.price)}</div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {feats.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 12, width: (w - 96 - 14) / 2, fontSize: 28, color: "#1e293b" }}>
                <div style={{ display: "flex", width: 34, height: 34, borderRadius: 999, background: b.color, alignItems: "center", justifyContent: "center" }}>
                  <div style={{ display: "flex", width: 9, height: 16, borderRight: "4px solid #fff", borderBottom: "4px solid #fff", transform: "rotate(45deg)", marginTop: -4 }} />
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
        <Footer b={b} />
      </div>
    );
  }

  if (tpl === "vendido") {
    return (
      <div style={{ display: "flex", flexDirection: "column", width: w, height: h, fontFamily: "Inter", position: "relative" }}>
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0 }}><Photo src={v.photos[0]} w={w} h={h} /></div>
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: w, height: h, background: "rgba(15,23,42,0.55)" }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center", gap: 24, color: "#fff" }}>
          <div style={{ display: "flex", padding: "18px 60px", border: "10px solid #22c55e", borderRadius: 28, color: "#22c55e", fontSize: tall ? 150 : 130, fontWeight: 800, transform: "rotate(-8deg)", background: "rgba(15,23,42,0.4)" }}>VENDIDO!</div>
          <div style={{ fontSize: 50, fontWeight: 800, marginTop: 30 }}>{v.title}</div>
          <div style={{ fontSize: 34, opacity: 0.9 }}>Mais um cliente satisfeito. Obrigado pela confiança!</div>
        </div>
        <Footer b={b} />
      </div>
    );
  }

  // destaque (padrão)
  return (
    <div style={{ display: "flex", flexDirection: "column", width: w, height: h, fontFamily: "Inter", position: "relative" }}>
      <div style={{ display: "flex", position: "absolute", top: 0, left: 0 }}><Photo src={v.photos[0]} w={w} h={h} /></div>
      <div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: w, height: h, backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.85) 100%)" }} />
      {v.badge && <div style={{ display: "flex", position: "absolute", top: 44, left: 44, padding: "12px 26px", background: b.color, color: "#fff", fontSize: 32, fontWeight: 800, borderRadius: 14 }}>{v.badge.toUpperCase()}</div>}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "flex-end", padding: "0 48px 36px", gap: 12, color: "#fff" }}>
        <div style={{ fontSize: tall ? 78 : 66, fontWeight: 800, lineHeight: 1.02 }}>{v.title}</div>
        {v.subtitle && <div style={{ fontSize: 32, opacity: 0.9 }}>{v.subtitle}</div>}
        <Chips items={specs} color="rgba(255,255,255,0.22)" />
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 8 }}>
          {v.previousPrice && <div style={{ fontSize: 36, opacity: 0.75, textDecoration: "line-through" }}>{brl(v.previousPrice)}</div>}
          <div style={{ fontSize: tall ? 100 : 86, fontWeight: 800 }}>{brl(v.price)}</div>
        </div>
      </div>
      <Footer b={b} />
    </div>
  );
}

function institutionalPost(tpl: InstitutionalTemplate, fmt: PostFormat, title: string, text: string, b: BrandData, photos: string[]) {
  const { w, h } = FORMATS[fmt];
  const tall = fmt !== "feed";
  const bg = `linear-gradient(145deg, ${b.color} 0%, ${hexToRgba(b.color, 0.75)} 55%, #0f172a 100%)`;

  if (tpl === "estoque" && photos.length > 0) {
    // colagem que se adapta à quantidade de fotos (1 a 4)
    const cells = photos.slice(0, 4);
    const gridH = Math.round(h * (tall ? 0.55 : 0.5));
    const gap = 12;
    const cols = cells.length === 4 ? 2 : cells.length;
    const rows = cells.length === 4 ? 2 : 1;
    const cw = (w - gap * (cols - 1)) / cols;
    const ch = (gridH - gap * (rows - 1)) / rows;
    return (
      <div style={{ display: "flex", flexDirection: "column", width: w, height: h, fontFamily: "Inter", background: "#0f172a" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap, width: w, height: gridH }}>
          {cells.map((src, i) => <Photo key={i} src={src} w={cw} h={ch} />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", padding: "0 56px", gap: 16, color: "#fff", backgroundImage: bg }}>
          <div style={{ fontSize: tall ? 88 : 72, fontWeight: 800, lineHeight: 1.02 }}>{title}</div>
          {text && <div style={{ fontSize: 34, opacity: 0.9 }}>{text}</div>}
        </div>
        <Footer b={b} dark={false} />
      </div>
    );
  }

  // só caracteres presentes na fonte (sem emoji)
  const icon = tpl === "troca" ? "R$" : tpl === "financiamento" ? "%" : "!";
  const body = tpl === "horario" ? (b.hours ?? "Consulte nossos horários pelo WhatsApp") : text;
  return (
    <div style={{ display: "flex", flexDirection: "column", width: w, height: h, fontFamily: "Inter", backgroundImage: bg }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", padding: "0 72px", gap: 30, color: "#fff" }}>
        {tpl !== "horario" && (
          <div style={{ display: "flex", width: 120, height: 120, borderRadius: 32, background: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", fontSize: 70, fontWeight: 800 }}>{icon}</div>
        )}
        <div style={{ fontSize: tall ? 104 : 86, fontWeight: 800, lineHeight: 1.02 }}>{title}</div>
        {body && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {body.split(/\n|·/).map((line) => line.trim()).filter(Boolean).map((line) => (
              <div key={line} style={{ fontSize: tpl === "horario" ? 46 : 40, opacity: 0.92, fontWeight: tpl === "horario" ? 600 : 400 }}>{line}</div>
            ))}
          </div>
        )}
      </div>
      <Footer b={b} dark={false} />
    </div>
  );
}

export async function renderVehiclePost(tpl: VehicleTemplate, fmt: PostFormat, v: VehicleData, b: BrandData) {
  const { w, h } = FORMATS[fmt];
  return new ImageResponse(vehiclePost(tpl, fmt, v, b), { width: w, height: h, fonts: await fonts() });
}

export async function renderInstitutionalPost(tpl: InstitutionalTemplate, fmt: PostFormat, title: string, text: string, b: BrandData, photos: string[]) {
  const { w, h } = FORMATS[fmt];
  return new ImageResponse(institutionalPost(tpl, fmt, title, text, b, photos), { width: w, height: h, fonts: await fonts() });
}
