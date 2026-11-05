import type { Fuel, StoreStatus, Transmission, VehicleStatus, VehicleType } from "@prisma/client";

export const fuelLabels: Record<Fuel, string> = {
  FLEX: "Flex",
  GASOLINE: "Gasolina",
  ETHANOL: "Etanol",
  DIESEL: "Diesel",
  ELECTRIC: "Elétrico",
  HYBRID: "Híbrido",
  GNV: "GNV",
};

export const transmissionLabels: Record<Transmission, string> = {
  MANUAL: "Manual",
  AUTOMATIC: "Automático",
  CVT: "CVT",
  AUTOMATED: "Automatizado",
};

export const vehicleTypeLabels: Record<VehicleType, string> = {
  CAR: "Carro",
  MOTORCYCLE: "Moto",
  TRUCK: "Caminhão",
  OTHER: "Outro",
};

export const vehicleStatusLabels: Record<VehicleStatus, string> = {
  PREPARING: "Em preparação",
  AVAILABLE: "À venda",
  RESERVED: "Reservado",
  SOLD: "Vendido",
};

export const storeStatusLabels: Record<StoreStatus, string> = {
  PENDING: "Aguardando aprovação",
  ACTIVE: "Ativa",
  SUSPENDED: "Suspensa",
};

export const BR_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "SC", "SE", "SP", "RO", "RR", "TO",
] as const;

/** Sugestões de opcionais por tipo (a loja pode acrescentar outros). */
export const FEATURES_BY_TYPE: Record<"CAR" | "MOTORCYCLE" | "TRUCK" | "OTHER", string[]> = {
  CAR: [
    "Ar-condicionado", "Direção hidráulica", "Direção elétrica", "Vidros elétricos", "Travas elétricas",
    "Alarme", "Airbag", "Freios ABS", "Câmera de ré", "Sensor de estacionamento", "Central multimídia",
    "Bancos de couro", "Rodas de liga leve", "Teto solar", "Piloto automático", "Único dono", "IPVA pago",
    "Revisões na concessionária", "Manual e chave reserva",
  ],
  MOTORCYCLE: [
    "Freios ABS", "Partida elétrica", "Injeção eletrônica", "Freio a disco", "Painel digital", "Baú",
    "Protetor de motor", "Único dono", "IPVA pago", "Revisões na concessionária", "Manual e chave reserva",
  ],
  TRUCK: [
    "Ar-condicionado", "Direção hidráulica", "Freios ABS", "Freio motor", "Cabine leito", "Tacógrafo",
    "Rastreador", "Único dono", "IPVA pago",
  ],
  OTHER: ["Único dono", "IPVA pago"],
};

export const watermarkPositionLabels = {
  BOTTOM_RIGHT: "Canto inferior direito",
  BOTTOM_LEFT: "Canto inferior esquerdo",
  TOP_RIGHT: "Canto superior direito",
  TOP_LEFT: "Canto superior esquerdo",
  CENTER: "Centro",
} as const;
