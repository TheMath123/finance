const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formata centavos (bigint/integer, nunca float — spec: dinheiro) em "R$ 0,00". */
export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}
