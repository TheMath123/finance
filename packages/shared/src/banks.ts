/**
 * Catálogo de bancos — fonte única para validação no backend e renderização no app.
 * Adicionar um banco = adicionar uma entrada aqui (sem migração de banco de dados).
 */
export interface BankCatalogEntry {
  /** Código estável usado em Bank.bank_code */
  code: string;
  name: string;
  /** Cor primária da marca (hex) para UI */
  color: string;
}

export const BANK_CATALOG: readonly BankCatalogEntry[] = [
  { code: "nubank", name: "Nubank", color: "#820AD1" },
  { code: "itau", name: "Itaú", color: "#EC7000" },
  { code: "bradesco", name: "Bradesco", color: "#CC092F" },
  { code: "santander", name: "Santander", color: "#EC0000" },
  { code: "bb", name: "Banco do Brasil", color: "#F9DD16" },
  { code: "caixa", name: "Caixa Econômica Federal", color: "#005CA9" },
  { code: "inter", name: "Inter", color: "#FF7A00" },
  { code: "c6", name: "C6 Bank", color: "#1A1A1A" },
  { code: "btg", name: "BTG Pactual", color: "#001E4B" },
  { code: "xp", name: "XP", color: "#0D0D0D" },
  { code: "picpay", name: "PicPay", color: "#11C76F" },
  { code: "mercadopago", name: "Mercado Pago", color: "#00AEEF" },
  { code: "neon", name: "Neon", color: "#00E1E4" },
  { code: "pagbank", name: "PagBank", color: "#8CC63F" },
  { code: "safra", name: "Safra", color: "#0F1E46" },
  { code: "sicoob", name: "Sicoob", color: "#003641" },
  { code: "sicredi", name: "Sicredi", color: "#3FA110" },
  { code: "banrisul", name: "Banrisul", color: "#0067B1" },
  { code: "bmg", name: "BMG", color: "#F26522" },
  { code: "wise", name: "Wise", color: "#9FE870" },
  { code: "nomad", name: "Nomad", color: "#00F5D4" },
  { code: "revolut", name: "Revolut", color: "#191C1F" },
  { code: "other", name: "Outro", color: "#6B7280" },
] as const;

export const BANK_CODES = BANK_CATALOG.map((b) => b.code);

export function isValidBankCode(code: string): boolean {
  return BANK_CODES.includes(code);
}

export function getBank(code: string): BankCatalogEntry | undefined {
  return BANK_CATALOG.find((b) => b.code === code);
}
