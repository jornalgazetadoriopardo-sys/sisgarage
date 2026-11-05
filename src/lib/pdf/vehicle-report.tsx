import "server-only";
import sharp from "sharp";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { VehicleReport } from "../vehicle-report";
import { readPublicFile } from "../storage";
import { formatDocument } from "../br-docs";
import { formatPhone, vehicleTitle } from "../format";
import { documentStatusLabels, documentTypeLabels, expenseCategoryLabels, fuelLabels, taxKindLabels, transmissionLabels, vehicleStatusLabels } from "../labels";

Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  page: { paddingTop: 32, paddingBottom: 48, paddingHorizontal: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#1e293b", lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: "#1d55d8", marginBottom: 14 },
  store: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  small: { fontSize: 8, color: "#64748b" },
  title: { fontSize: 17, fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 10, color: "#475569", marginBottom: 10 },
  h: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6, color: "#1a45ad" },
  photos: { flexDirection: "row", gap: 6, marginBottom: 10 },
  cover: { width: 300, height: 200, objectFit: "cover", borderRadius: 4 },
  thumbs: { flex: 1, gap: 6 },
  thumb: { width: "100%", height: 62, objectFit: "cover", borderRadius: 4 },
  kpis: { flexDirection: "row", gap: 6, marginBottom: 6 },
  kpi: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, padding: 7 },
  kLabel: { fontSize: 7, color: "#64748b", textTransform: "uppercase" },
  kValue: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "25%", marginBottom: 5 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingVertical: 3 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, fontSize: 7, color: "#94a3b8", textAlign: "center" },
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const day = (d: Date | null | undefined) => (d ? d.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—");

async function jpeg(url: string, w: number) {
  return readPublicFile(url).then((b) => sharp(b).resize({ width: w }).jpeg({ quality: 80 }).toBuffer()).catch(() => null);
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={s.cell}>
      <Text style={s.kLabel}>{label}</Text>
      <Text>{value || "—"}</Text>
    </View>
  );
}

function Row({ cols, bold }: { cols: [string, string?][]; bold?: boolean }) {
  return (
    <View style={s.tr} wrap={false}>
      {cols.map(([text, w], i) => (
        <Text key={i} style={{ width: w ?? `${100 / cols.length}%`, textAlign: i === cols.length - 1 ? "right" : "left", fontFamily: bold ? "Helvetica-Bold" : "Helvetica" }}>{text}</Text>
      ))}
    </View>
  );
}

export async function renderVehicleReport(r: VehicleReport, withFinance: boolean) {
  const { v, sale, metrics: m, finance: f } = r;
  const [cover, ...thumbs] = await Promise.all(v.photos.slice(0, 4).map((p, i) => jpeg(p.url, i === 0 ? 900 : 400)));
  const logo = v.store.logoUrl ? await readPublicFile(v.store.logoUrl).then((b) => sharp(b).resize(120).png().toBuffer()).catch(() => null) : null;
  const sold = sale?.status === "COMPLETED";

  const doc = (
    <Document title={`Ficha – ${vehicleTitle(v)}`} author={v.store.name} creator="SisGarage">
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf */}
            {logo && <Image src={{ data: logo, format: "png" }} style={{ width: 30, height: 30 }} />}
            <View>
              <Text style={s.store}>{v.store.legalName || v.store.name}</Text>
              <Text style={s.small}>{[v.store.cnpj ? `CNPJ ${formatDocument(v.store.cnpj)}` : null, `${v.store.city}/${v.store.state}`, v.store.phone ? formatPhone(v.store.phone) : null].filter(Boolean).join(" · ")}</Text>
            </View>
          </View>
          <Text style={s.small}>{`FICHA DO VEÍCULO · ${new Date().toLocaleDateString("pt-BR")}`}</Text>
        </View>

        <Text style={s.title}>{`${vehicleTitle(v)} ${v.yearManufacture}/${v.yearModel}`}</Text>
        <Text style={s.sub}>{[vehicleStatusLabels[v.status], v.plate ? `Placa ${v.plate}` : null, `${v.mileage.toLocaleString("pt-BR")} km`].filter(Boolean).join(" · ")}</Text>

        {cover && (
          <View style={s.photos}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf */}
            <Image src={{ data: cover, format: "jpg" }} style={s.cover} />
            <View style={s.thumbs}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf */}
              {thumbs.map((t, i) => t && <Image key={i} src={{ data: t, format: "jpg" }} style={s.thumb} />)}
            </View>
          </View>
        )}

        <View style={s.kpis}>
          {([
            [sold ? "Dias até vender" : "Dias na loja", String(m.days)],
            ["Preço atual", brl(m.price)],
            ["FIPE", m.fipeLast ? brl(m.fipeLast) : "—"],
            ["Preço × FIPE", pct(m.vsFipe)],
          ] as [string, string][]).map(([k, val]) => (
            <View key={k} style={s.kpi}><Text style={s.kLabel}>{k}</Text><Text style={s.kValue}>{val}</Text></View>
          ))}
        </View>
        <View style={s.kpis}>
          {([
            ["Variação do preço", `${pct(m.priceChange)} (${m.priceChanges} alt.)`],
            ["Variação da FIPE", pct(m.fipeChange)],
            ["Visitas no site", String(v.views)],
            ["Contatos / agendamentos", `${v._count.leads} / ${v._count.appointments}`],
          ] as [string, string][]).map(([k, val]) => (
            <View key={k} style={s.kpi}><Text style={s.kLabel}>{k}</Text><Text style={[s.kValue, { fontSize: 10 }]}>{val}</Text></View>
          ))}
        </View>

        <Text style={s.h}>Características</Text>
        <View style={s.grid}>
          <Field label="Marca / modelo" value={`${v.brand} ${v.model}`} />
          <Field label="Versão" value={v.version} />
          <Field label="Motor" value={v.engine} />
          <Field label="Cor" value={v.color} />
          <Field label="Combustível" value={fuelLabels[v.fuel]} />
          <Field label="Câmbio" value={transmissionLabels[v.transmission]} />
          <Field label="Renavam" value={v.renavam} />
          <Field label="Chassi" value={v.chassis} />
          <Field label="Entrada no estoque" value={day(m.entry)} />
          <Field label="Código FIPE" value={v.fipeCode} />
        </View>
        {v.features.length > 0 && <Text style={{ marginTop: 2 }}>{`Opcionais: ${v.features.map((x) => x.name).join(", ")}.`}</Text>}

        {withFinance && (
          <>
            <Text style={s.h}>{sold ? "Resultado da venda" : "Custos e resultado previsto"}</Text>
            <Row cols={[["Compra"], [`${day(v.purchaseDate)} · ${v.purchaseFrom ?? "—"}`], [brl(f.purchase)]]} />
            <Row cols={[["Gastos de preparação"], [`${v.expenses.length} lançamento(s)`], [brl(f.expenses)]]} />
            <Row cols={[["IPVA, multas e débitos"], [`${v.taxes.length} lançamento(s)`], [brl(f.taxes)]]} />
            <Row bold cols={[["Custo total"], [""], [brl(f.cost)]]} />
            <Row cols={[[sold ? "Vendido por" : "Preço de venda"], [sold && sale ? `Venda nº ${sale.number} · ${day(sale.date)}` : ""], [brl(f.price)]]} />
            {sold && sale?.commission ? <Row cols={[["Comissão"], [""], [brl(Number(sale.commission))]]} /> : null}
            <Row bold cols={[[sold ? "Lucro real" : "Lucro previsto"], [""], [f.cost > 0 ? brl(f.profit - (sold && sale?.commission ? Number(sale.commission) : 0)) : "—"]]} />
            {v.expenses.length > 0 && (
              <>
                <Text style={s.h}>Gastos</Text>
                {v.expenses.map((e) => <Row key={e.id} cols={[[day(e.date), "15%"], [`${expenseCategoryLabels[e.category]} · ${e.description}`, "65%"], [brl(Number(e.amount)), "20%"]]} />)}
              </>
            )}
          </>
        )}

        {v.taxes.length > 0 && (
          <>
            <Text style={s.h}>IPVA, licenciamento e multas</Text>
            {v.taxes.map((t) => (
              <Row key={t.id} cols={[[taxKindLabels[t.kind], "25%"], [t.paidAt ? `Pago em ${day(t.paidAt)}` : `Em aberto · vence ${day(t.dueDate)}`, "55%"], [withFinance ? brl(Number(t.amount)) : "", "20%"]]} />
            ))}
          </>
        )}

        <Text style={s.h}>Documentação</Text>
        {v.documents.map((d) => (
          <Row key={d.id} cols={[[d.type === "OTHER" ? d.label ?? "Outro" : documentTypeLabels[d.type], "55%"], [d.expiresAt ? `Validade ${day(d.expiresAt)}` : "", "25%"], [documentStatusLabels[d.status], "20%"]]} />
        ))}

        <Text style={s.h}>Histórico de preço e FIPE</Text>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Row bold cols={[["Data"], ["Preço"]]} />
            {v.priceHistory.map((p) => <Row key={p.id} cols={[[p.changedAt.toLocaleDateString("pt-BR")], [brl(Number(p.price))]]} />)}
          </View>
          <View style={{ flex: 1 }}>
            <Row bold cols={[["Referência FIPE"], ["Valor"]]} />
            {v.fipeHistory.length ? v.fipeHistory.map((h) => <Row key={h.id} cols={[[h.reference], [brl(Number(h.value))]]} />) : <Row cols={[["Sem histórico"], [""]]} />}
          </View>
        </View>

        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `${v.store.name} · Ficha gerada pelo SisGarage · Página ${pageNumber} de ${totalPages}${withFinance ? " · Documento interno com valores de custo" : ""}`} />
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
