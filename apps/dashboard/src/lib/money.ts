/** Centavos → "R$ 1.234,56" (regra do spec: dinheiro é sempre bigint de centavos no backend). */
export function formatCents(cents: number): string {
	return (cents / 100).toLocaleString('pt-BR', {
		style: 'currency',
		currency: 'BRL'
	});
}

/**
 * Entrada de formulário em reais ("1234,56", "1.234,56" ou "1234.56") → centavos.
 * Retorna null quando não é um número válido — quem chama decide a mensagem.
 */
export function parseReaisToCents(raw: string): number | null {
	const normalized = raw.trim().replace(/\./g, '').replace(',', '.');
	if (!normalized) return null;
	const value = Number(normalized);
	if (!Number.isFinite(value)) return null;
	return Math.round(value * 100);
}
