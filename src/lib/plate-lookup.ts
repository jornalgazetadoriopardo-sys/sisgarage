import "server-only";

/**
 * Consulta de dados do veículo pela placa (fase 5).
 *
 * A plataforma ainda não tem provedor contratado. Quando houver, implemente o
 * provedor aqui (ex.: chamada HTTP com PLATE_API_TOKEN) e devolva PlateLookupResult.
 * O formulário de cadastro já chama esta função e preenche os campos.
 */
export type PlateLookupResult = {
  brand?: string;
  model?: string;
  version?: string;
  yearManufacture?: number;
  yearModel?: number;
  color?: string;
  fuel?: string;
  chassis?: string;
};

export type PlateLookupResponse =
  | { ok: true; data: PlateLookupResult }
  | { ok: false; reason: "not_configured" | "not_found" | "error"; message: string };

export function plateLookupEnabled() {
  return Boolean(process.env.PLATE_API_PROVIDER && process.env.PLATE_API_TOKEN);
}

export async function lookupPlate(plate: string, renavam?: string): Promise<PlateLookupResponse> {
  void plate;
  void renavam;
  if (!plateLookupEnabled()) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Consulta por placa ainda não está ativa. Preencha os dados manualmente.",
    };
  }
  // Ponto de integração com o provedor escolhido.
  return { ok: false, reason: "error", message: `Provedor "${process.env.PLATE_API_PROVIDER}" não implementado.` };
}
