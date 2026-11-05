/** Modelos de post e textos padrão (usados no servidor e na tela). */
export const VEHICLE_TEMPLATES = {
  destaque: { label: "Destaque", hint: "Foto grande com preço e contato" },
  oferta: { label: "Oferta", hint: "Preço “De/Por” em evidência" },
  chegou: { label: "Acabou de chegar", hint: "Novidade no estoque" },
  detalhes: { label: "Ficha técnica", hint: "Foto e principais itens" },
  vendido: { label: "Vendido!", hint: "Comemore a venda" },
} as const;

export const INSTITUTIONAL_TEMPLATES = {
  aviso: { label: "Aviso", hint: "Texto livre", title: "Novidades toda semana", text: "Venha conhecer nosso estoque de seminovos revisados." },
  horario: { label: "Horário", hint: "Horário de atendimento", title: "Horário de atendimento", text: "" },
  troca: { label: "Troca", hint: "Aceitamos seu usado", title: "Aceitamos seu usado na troca", text: "Avaliação na hora e o melhor valor pelo seu veículo." },
  financiamento: { label: "Financiamento", hint: "Crédito facilitado", title: "Financiamento facilitado", text: "Aprovação rápida, com ou sem entrada. Consulte as condições." },
  estoque: { label: "Nosso estoque", hint: "Colagem de fotos", title: "Confira nosso estoque", text: "Carros e motos revisados, prontos para você." },
} as const;

export const FORMATS = {
  feed: { label: "Feed quadrado", w: 1080, h: 1080 },
  retrato: { label: "Feed retrato", w: 1080, h: 1350 },
  story: { label: "Story / Status", w: 1080, h: 1920 },
} as const;

export type VehicleTemplate = keyof typeof VEHICLE_TEMPLATES;
export type InstitutionalTemplate = keyof typeof INSTITUTIONAL_TEMPLATES;
export type PostFormat = keyof typeof FORMATS;
