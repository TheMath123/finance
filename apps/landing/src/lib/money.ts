/** Centavos → "R$ 1.234,56" (regra do spec: dinheiro é sempre bigint de centavos no backend). */
export function formatCents(cents: number): string {
	return (cents / 100).toLocaleString('pt-BR', {
		style: 'currency',
		currency: 'BRL'
	});
}
