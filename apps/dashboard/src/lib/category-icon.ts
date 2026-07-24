import * as PhosphorIcons from 'phosphor-svelte';
import TagIcon from 'phosphor-svelte/lib/TagIcon';

type IconComponent = typeof TagIcon;

function toPascalCase(slug: string): string {
	return slug
		.split(/[-_\s]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('');
}

/**
 * `Category.icon` é um slug livre (ex.: "shopping-cart") que nunca foi de fato
 * resolvido pra um ícone — aqui ele vira o componente Phosphor equivalente
 * ("ShoppingCartIcon"). Mesma regra do app mobile (lib/category-icons.ts).
 * `import * as PhosphorIcons` importa o pacote inteiro (sem tree-shaking,
 * mesmo trade-off aceito no mobile) pra permitir indexação síncrona por
 * string — a alternativa (import dinâmico por ícone) gera um flash em
 * branco na primeira renderização SSR.
 */
export function resolveCategoryIcon(icon: string | null | undefined): IconComponent {
	if (!icon) return TagIcon;
	const componentName = `${toPascalCase(icon)}Icon`;
	const Icon = (PhosphorIcons as unknown as Record<string, IconComponent | undefined>)[
		componentName
	];
	return Icon ?? TagIcon;
}
