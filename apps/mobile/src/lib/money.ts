const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Formata centavos (bigint/integer, nunca float — spec: dinheiro) em "R$ 0,00". */
export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/**
 * Espelha `splitInstallments` do backend (invoice-rules.ts): divide o total em
 * `count` parcelas iguais, com o resto (arredondamento) somado na 1ª parcela.
 * Só pra preview em tempo real no form — a divisão de verdade acontece no backend.
 */
export function splitInstallmentsPreview(
  totalCents: number,
  count: number
): number[] {
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? base + remainder : base
  );
}
