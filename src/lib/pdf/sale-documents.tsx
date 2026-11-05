import "server-only";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { SaleDocData } from "./sale-data";
import { formatCep, formatDocument } from "../br-docs";
import { valorPorExtenso } from "../extenso";
import { formatPhone, vehicleTitle } from "../format";
import { fuelLabels, paymentMethodLabels } from "../labels";

// Não hifenizar palavras (evita "2017/-2018" e quebras estranhas em nomes)
Font.registerHyphenationCallback((word) => [word]);

export const SALE_DOCUMENTS = {
  "recibo-sinal": "Recibo de sinal",
  recibo: "Recibo de pagamento",
  contrato: "Contrato de compra e venda",
  garantia: "Termo de garantia",
} as const;
export type SaleDocKind = keyof typeof SALE_DOCUMENTS;

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 56, paddingHorizontal: 44, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b", lineHeight: 1.45 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: "#1d55d8", marginBottom: 18 },
  logo: { width: 52, height: 52, objectFit: "contain" },
  storeName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  small: { fontSize: 8.5, color: "#475569" },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 9, textAlign: "center", color: "#64748b", marginBottom: 16 },
  h: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 4 },
  p: { marginBottom: 6, textAlign: "justify" },
  b: { fontFamily: "Helvetica-Bold" },
  box: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 4, padding: 10, marginBottom: 10 },
  row: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "50%", marginBottom: 3 },
  cell3: { width: "33.33%", marginBottom: 3 },
  label: { fontSize: 7.5, color: "#64748b", textTransform: "uppercase" },
  table: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 4, marginBottom: 10 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 5, paddingHorizontal: 8 },
  th: { fontFamily: "Helvetica-Bold", backgroundColor: "#f1f5f9" },
  sigs: { flexDirection: "row", justifyContent: "space-between", marginTop: 40, gap: 30 },
  sig: { flex: 1, borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 4, textAlign: "center", fontSize: 8.5 },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, fontSize: 7.5, color: "#94a3b8", textAlign: "center" },
});

const brl = (v: number | { toString(): string }) => Number(v.toString()).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const day = (d: Date | null | undefined) => (d ? d.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—");
const longDay = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
const money = (v: number | { toString(): string }) => `${brl(v)} (${valorPorExtenso(Number(v.toString()))})`;

function Field({ label, value, wide }: { label: string; value?: string | null; wide?: "half" | "third" }) {
  return (
    <View style={wide === "third" ? s.cell3 : s.cell}>
      <Text style={s.label}>{label}</Text>
      <Text>{value || "—"}</Text>
    </View>
  );
}

function Header({ d }: { d: SaleDocData }) {
  const st = d.store;
  const addr = [st.address, `${st.city}/${st.state}`, st.zipCode ? `CEP ${formatCep(st.zipCode)}` : null].filter(Boolean).join(" · ");
  return (
    <View style={s.header} fixed>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf, não é <img> */}
      {d.logo && <Image style={s.logo} src={{ data: d.logo, format: "png" }} />}
      <View style={{ flex: 1 }}>
        <Text style={s.storeName}>{st.legalName || st.name}</Text>
        {st.legalName && st.legalName !== st.name && <Text style={s.small}>{st.name}</Text>}
        <Text style={s.small}>{[st.cnpj ? `CNPJ ${formatDocument(st.cnpj)}` : null, addr].filter(Boolean).join(" · ")}</Text>
        <Text style={s.small}>{[st.phone ? formatPhone(st.phone) : null, st.email].filter(Boolean).join(" · ")}</Text>
      </View>
    </View>
  );
}

function VehicleBox({ d }: { d: SaleDocData }) {
  const v = d.vehicle;
  return (
    <View style={s.box}>
      <View style={s.row}>
        <Field label="Veículo" value={vehicleTitle(v)} />
        <Field label="Ano fab./modelo" value={`${v.yearManufacture}/${v.yearModel}`} wide="third" />
        <Field label="Cor" value={v.color} wide="third" />
        <Field label="Combustível" value={fuelLabels[v.fuel]} wide="third" />
        <Field label="Quilometragem" value={`${(d.mileageAtSale ?? v.mileage).toLocaleString("pt-BR")} km`} wide="third" />
        <Field label="Placa" value={v.plate} wide="third" />
        <Field label="Renavam" value={v.renavam} wide="third" />
        <Field label="Chassi" value={v.chassis} wide="third" />
      </View>
    </View>
  );
}

function CustomerBox({ d }: { d: SaleDocData }) {
  const c = d.customer;
  const addr = [c.address, c.district, c.city && c.state ? `${c.city}/${c.state}` : c.city, c.zipCode ? `CEP ${formatCep(c.zipCode)}` : null].filter(Boolean).join(", ");
  return (
    <View style={s.box}>
      <View style={s.row}>
        <Field label="Nome" value={c.name} />
        <Field label={c.document?.length === 14 ? "CNPJ" : "CPF"} value={formatDocument(c.document)} wide="third" />
        <Field label="RG" value={c.rg} wide="third" />
        <Field label="Telefone" value={c.phone ? formatPhone(c.phone) : null} wide="third" />
        <Field label="Endereço" value={addr} />
      </View>
    </View>
  );
}

function Payments({ d, onlyPaid }: { d: SaleDocData; onlyPaid?: boolean }) {
  const rows = onlyPaid ? d.payments.filter((p) => p.paidAt) : d.payments;
  return (
    <View style={s.table}>
      <View style={[s.tr, s.th]}>
        <Text style={{ width: "30%" }}>Forma</Text>
        <Text style={{ width: "40%" }}>Detalhes</Text>
        <Text style={{ width: "12%" }}>Venc.</Text>
        <Text style={{ width: "18%", textAlign: "right" }}>Valor</Text>
      </View>
      {rows.map((p) => (
        <View key={p.id} style={s.tr} wrap={false}>
          <Text style={{ width: "30%" }}>{paymentMethodLabels[p.method]}</Text>
          <Text style={{ width: "40%" }}>{p.details ?? (p.paidAt ? "Recebido" : "A receber")}</Text>
          <Text style={{ width: "12%" }}>{p.dueDate ? day(p.dueDate) : "—"}</Text>
          <Text style={{ width: "18%", textAlign: "right" }}>{brl(p.amount)}</Text>
        </View>
      ))}
    </View>
  );
}

function Signatures({ left, right, witnesses }: { left: string; right: string; witnesses?: boolean }) {
  return (
    <View wrap={false}>
      <View style={s.sigs}>
        <Text style={s.sig}>{left}</Text>
        <Text style={s.sig}>{right}</Text>
      </View>
      {witnesses && (
        <View style={s.sigs}>
          <Text style={s.sig}>Testemunha 1 · Nome e CPF</Text>
          <Text style={s.sig}>Testemunha 2 · Nome e CPF</Text>
        </View>
      )}
    </View>
  );
}

function Shell({ d, kind, children }: { d: SaleDocData; kind: SaleDocKind; children: React.ReactNode }) {
  return (
    <Document title={`${SALE_DOCUMENTS[kind]} – Venda nº ${d.number}`} author={d.store.name} creator="SisGarage">
      <Page size="A4" style={s.page}>
        <Header d={d} />
        <Text style={s.title}>{SALE_DOCUMENTS[kind].toUpperCase()}</Text>
        <Text style={s.subtitle}>{`Venda nº ${d.number} · ${day(d.date)}`}</Text>
        {children}
        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `${d.store.name} · Documento gerado pelo SisGarage em ${new Date().toLocaleDateString("pt-BR")} · Página ${pageNumber} de ${totalPages}`} />
      </Page>
    </Document>
  );
}

function docOf(d: SaleDocData) {
  const c = d.customer;
  return c.document ? `, ${c.document.length === 14 ? "CNPJ" : "CPF"} ${formatDocument(c.document)}` : "";
}

function sellerName(d: SaleDocData) {
  return d.store.legalName || d.store.name;
}

function DepositReceipt({ d }: { d: SaleDocData }) {
  const paid = d.payments.filter((p) => p.paidAt).reduce((t, p) => t + Number(p.amount), 0);
  const rest = Number(d.price) - paid;
  return (
    <Shell d={d} kind="recibo-sinal">
      <Text style={s.p}>
        <Text style={s.b}>{sellerName(d)}</Text>{" declara ter recebido de "}<Text style={s.b}>{`${d.customer.name}${docOf(d) ? "," : ""}`}</Text>
        {`${docOf(d).replace(/^, /, " ")}, a importância de `}
        <Text style={s.b}>{`${money(paid)},`}</Text>
        {" a título de sinal e princípio de pagamento para a reserva do veículo abaixo descrito."}
      </Text>
      <Text style={s.h}>Veículo reservado</Text>
      <VehicleBox d={d} />
      <Text style={s.h}>Valores</Text>
      <Text style={s.p}>Valor total negociado: <Text style={s.b}>{`${money(d.price)}.`}</Text></Text>
      <Text style={s.p}>Saldo a pagar: <Text style={s.b}>{`${money(rest)}.`}</Text></Text>
      <Payments d={d} onlyPaid />
      <Text style={s.p}>
        O veículo permanecerá reservado em nome do comprador até a conclusão do negócio. Em caso de desistência, aplica-se o disposto
        nos artigos 417 a 420 do Código Civil quanto ao sinal (arras).
      </Text>
      {d.notes && <><Text style={s.h}>Observações</Text><Text style={s.p}>{d.notes}</Text></>}
      <Text style={[s.p, { marginTop: 10 }]}>{`${d.store.city}/${d.store.state}, ${longDay(d.date)}.`}</Text>
      <Signatures left={`${sellerName(d)}\nVendedora`} right={`${d.customer.name}\nComprador(a)`} />
    </Shell>
  );
}

function PaymentReceipt({ d }: { d: SaleDocData }) {
  const paid = d.payments.filter((p) => p.paidAt).reduce((t, p) => t + Number(p.amount), 0);
  const pending = Number(d.price) - paid;
  return (
    <Shell d={d} kind="recibo">
      <Text style={s.p}>
        <Text style={s.b}>{sellerName(d)}</Text>{" declara ter recebido de "}<Text style={s.b}>{`${d.customer.name}${docOf(d) ? "," : ""}`}</Text>
        {`${docOf(d).replace(/^, /, " ")}, a importância de `}
        <Text style={s.b}>{`${money(paid)},`}</Text>
        {` referente à compra do veículo abaixo, pelo valor total de ${money(d.price)}.`}
      </Text>
      <Text style={s.h}>Veículo</Text>
      <VehicleBox d={d} />
      <Text style={s.h}>Pagamentos</Text>
      <Payments d={d} />
      {pending > 0.005 ? (
        <Text style={s.p}>
          {"Permanece em aberto o valor de "}<Text style={s.b}>{`${money(pending)},`}</Text>{" nas condições acima. A quitação refere-se apenas aos valores efetivamente recebidos."}
        </Text>
      ) : (
        <Text style={s.p}>Pelo valor recebido, damos plena, geral e irrevogável quitação quanto ao preço do veículo acima descrito.</Text>
      )}
      <Text style={[s.p, { marginTop: 10 }]}>{`${d.store.city}/${d.store.state}, ${longDay(d.date)}.`}</Text>
      <Signatures left={`${sellerName(d)}\nVendedora`} right={`${d.customer.name}\nComprador(a)`} />
    </Shell>
  );
}

function Contract({ d }: { d: SaleDocData }) {
  const st = d.store;
  const c = d.customer;
  const t = d.tradeInVehicle;
  const tradePay = d.payments.find((p) => p.method === "TRADE_IN");
  let n = 0;
  const cl = () => `CLÁUSULA ${++n}ª`;
  return (
    <Shell d={d} kind="contrato">
      <Text style={s.h}>Vendedora</Text>
      <Text style={s.p}>
        <Text style={s.b}>{`${st.legalName || st.name},`}</Text>
        {`${st.cnpj ? ` inscrita no CNPJ sob o nº ${formatDocument(st.cnpj)},` : ""} com sede em ${[st.address, `${st.city}/${st.state}`].filter(Boolean).join(", ")}.`}
      </Text>
      <Text style={s.h}>Comprador(a)</Text>
      <CustomerBox d={d} />
      <Text style={s.p}>As partes acima identificadas celebram o presente contrato de compra e venda de veículo, mediante as cláusulas a seguir.</Text>

      <Text style={s.h}>{cl()} – Do objeto</Text>
      <Text style={s.p}>A VENDEDORA vende ao(à) COMPRADOR(A) o veículo abaixo descrito, de sua propriedade ou posse legítima:</Text>
      <VehicleBox d={d} />

      <Text style={s.h}>{cl()} – Do preço e da forma de pagamento</Text>
      <Text style={s.p}>{"O preço total certo e ajustado é de "}<Text style={s.b}>{`${money(d.price)},`}</Text>{" pago da seguinte forma:"}</Text>
      <Payments d={d} />

      {t && tradePay && (
        <>
          <Text style={s.h}>{cl()} – Do veículo recebido em troca</Text>
          <Text style={s.p}>
            {`Como parte do pagamento, o(a) COMPRADOR(A) entrega à VENDEDORA o veículo ${vehicleTitle(t)}, ano de fabricação ${t.yearManufacture} e modelo ${t.yearModel}${t.plate ? `, placa ${t.plate}` : ""}, pelo valor de ${money(tradePay.amount)}, declarando ser seu legítimo proprietário e que o bem se encontra livre de ônus, multas, débitos e restrições, responsabilizando-se por quaisquer pendências anteriores à data da entrega.`}
          </Text>
        </>
      )}

      <Text style={s.h}>{cl()} – Do estado do veículo</Text>
      <Text style={s.p}>
        O(A) COMPRADOR(A) declara ter examinado o veículo, que é usado, e recebê-lo no estado de conservação e funcionamento em que se
        {`encontra, com ${(d.mileageAtSale ?? d.vehicle.mileage).toLocaleString("pt-BR")} km registrados no hodômetro na data da venda.`}
      </Text>

      <Text style={s.h}>{cl()} – Da garantia</Text>
      <Text style={s.p}>
        {d.warrantyDays > 0
          ? `A VENDEDORA concede garantia de ${d.warrantyDays} dias para motor e câmbio, contados da entrega do veículo, nos termos do Termo de Garantia que acompanha este contrato, sem prejuízo dos direitos previstos no Código de Defesa do Consumidor.`
          : "Aplica-se a garantia legal prevista no Código de Defesa do Consumidor."}
      </Text>

      <Text style={s.h}>{cl()} – Da transferência</Text>
      <Text style={s.p}>
        O(A) COMPRADOR(A) obriga-se a providenciar a transferência de propriedade junto ao órgão de trânsito no prazo de 30 (trinta) dias,
        conforme o art. 123, § 1º, do Código de Trânsito Brasileiro. A VENDEDORA fará a comunicação de venda prevista no art. 134 do mesmo Código.
      </Text>

      <Text style={s.h}>{cl()} – Das responsabilidades</Text>
      <Text style={s.p}>
        Multas, tributos e débitos relativos a fatos ocorridos até a data da entrega do veículo são de responsabilidade da VENDEDORA. A partir
        da entrega, passam a ser de responsabilidade do(a) COMPRADOR(A), inclusive no âmbito civil e criminal.
      </Text>

      {d.notes && (
        <>
          <Text style={s.h}>{cl()} – Das condições adicionais</Text>
          <Text style={s.p}>{d.notes}</Text>
        </>
      )}

      <Text style={s.h}>{cl()} – Do foro</Text>
      <Text style={s.p}>{`Fica eleito o foro da comarca de ${st.city}/${st.state} para dirimir eventuais questões oriundas deste contrato.`}</Text>
      <Text style={s.p}>E, por estarem de acordo, as partes assinam o presente em 2 (duas) vias de igual teor.</Text>
      <Text style={[s.p, { marginTop: 6 }]}>{`${st.city}/${st.state}, ${longDay(d.date)}.`}</Text>
      <Signatures left={`${st.legalName || st.name}\nVendedora`} right={`${c.name}\nComprador(a)`} witnesses />
    </Shell>
  );
}

function Warranty({ d }: { d: SaleDocData }) {
  const until = new Date(d.date.getTime() + d.warrantyDays * 86_400_000);
  return (
    <Shell d={d} kind="garantia">
      <Text style={s.p}>
        <Text style={s.b}>{sellerName(d)}</Text>{" concede a "}<Text style={s.b}>{d.customer.name}</Text>{" garantia para o veículo abaixo descrito, nas condições deste termo."}
      </Text>
      <VehicleBox d={d} />
      <Text style={s.h}>1. Prazo</Text>
      <Text style={s.p}>{`${d.warrantyDays} dias, de ${day(d.date)} a ${day(until)}.`}</Text>
      <Text style={s.h}>2. Cobertura</Text>
      <Text style={s.p}>Motor e câmbio: partes internas lubrificadas, contra defeitos de funcionamento não decorrentes de uso inadequado.</Text>
      <Text style={s.h}>3. Exclusões</Text>
      <Text style={s.p}>
        Itens de desgaste natural (pneus, freios, embreagem, bateria, lâmpadas, palhetas, amortecedores e componentes de suspensão), óleos e
        filtros, danos causados por acidente, mau uso, superaquecimento, falta de manutenção, uso de combustível inadequado, alterações ou
        reparos feitos por terceiros sem autorização da VENDEDORA.
      </Text>
      <Text style={s.h}>4. Como acionar</Text>
      <Text style={s.p}>
        {`Ao notar qualquer defeito, o(a) comprador(a) deve interromper o uso e comunicar a VENDEDORA${d.store.phone ? ` pelo telefone ${formatPhone(d.store.phone)}` : ""}. O diagnóstico e o reparo serão realizados em oficina indicada pela VENDEDORA.`}
      </Text>
      <Text style={s.h}>5. Direitos do consumidor</Text>
      <Text style={s.p}>Esta garantia não exclui nem reduz os direitos previstos no Código de Defesa do Consumidor.</Text>
      <Text style={[s.p, { marginTop: 10 }]}>{`${d.store.city}/${d.store.state}, ${longDay(d.date)}.`}</Text>
      <Signatures left={`${sellerName(d)}\nVendedora`} right={`${d.customer.name}\nComprador(a)`} />
    </Shell>
  );
}

export function availableDocuments(status: "RESERVED" | "COMPLETED" | "CANCELED", warrantyDays: number): SaleDocKind[] {
  if (status === "RESERVED") return ["recibo-sinal"];
  if (status === "COMPLETED") return ["contrato", "recibo", ...(warrantyDays > 0 ? (["garantia"] as const) : [])];
  return [];
}

export async function renderSaleDocument(kind: SaleDocKind, d: SaleDocData) {
  const el =
    kind === "recibo-sinal" ? <DepositReceipt d={d} />
    : kind === "recibo" ? <PaymentReceipt d={d} />
    : kind === "contrato" ? <Contract d={d} />
    : <Warranty d={d} />;
  return renderToBuffer(el);
}
