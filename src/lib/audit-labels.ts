const LABELS: Record<string, string> = {
  "veiculo.criado": "Veículo cadastrado",
  "veiculo.alterado": "Anúncio alterado",
  "compra.salva": "Dados da compra salvos",
  "gasto.criado": "Gasto lançado",
  "gasto.excluido": "Gasto excluído",
  "documento.salvo": "Documento atualizado",
  "documento.excluido": "Documento removido",
  "debito.criado": "Débito lançado",
  "debito.pago": "Débito pago",
  "debito.reaberto": "Débito reaberto",
  "debito.excluido": "Débito excluído",
  "fipe.vinculada": "Tabela FIPE vinculada",
};

export function auditLabel(action: string) {
  return LABELS[action] ?? action.replace(".", ": ");
}
