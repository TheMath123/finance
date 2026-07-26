/** Centavos → "R$ 1.234,56" (regra do spec: dinheiro é sempre bigint de centavos no backend). */
export function formatCents(cents: number): string {
	return (cents / 100).toLocaleString('pt-BR', {
		style: 'currency',
		currency: 'BRL'
	});
}

/**
 * Valor já em reais → "R$ 1.234,56" — usado pela calculadora de fórmulas
 * (M5-01): o catálogo de variáveis já converte centavos pra reais antes de
 * entrar na expressão, porque números digitados pelo usuário no teclado são
 * naturalmente reais ("8" significa oito reais, não oito centavos).
 */
export function formatReais(value: number): string {
	return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
