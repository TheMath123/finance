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

function toKebabCase(pascal: string): string {
	return pascal
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
		.toLowerCase();
}

/**
 * Slugs do seed original (M1) cujo nome não bate 1:1 com o ícone real do
 * Phosphor (ex.: não existe "PartyPopperIcon", o equivalente chama-se
 * "Confetti") — sem isto, essas 5 categorias caíam silenciosamente no
 * ícone genérico.
 */
const ICON_ALIASES: Record<string, string> = {
	home: 'House',
	'party-popper': 'Confetti',
	'heart-pulse': 'Heartbeat',
	banknote: 'Money',
	'circle-ellipsis': 'DotsThreeCircle'
};

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
	const componentName = `${ICON_ALIASES[icon] ?? toPascalCase(icon)}Icon`;
	const Icon = (PhosphorIcons as unknown as Record<string, IconComponent | undefined>)[
		componentName
	];
	return Icon ?? TagIcon;
}

/**
 * Todas as ~1500 opções do pacote instalado, derivadas em runtime (não
 * hardcoded) — cada nome exportado (`AcornIcon`, `ZoomInIcon`, ...) vira um
 * slug kebab-case, mas só entra na lista se o slug voltar a resolver pro
 * mesmo componente (`toPascalCase(slug) === nome`) — garante que todo item
 * do picker realmente renderiza um ícone, nunca o fallback genérico.
 */
export const CATEGORY_ICON_OPTIONS: string[] = Object.keys(PhosphorIcons)
	.filter((name) => name.endsWith('Icon'))
	.map((name) => name.slice(0, -'Icon'.length))
	.map((base) => ({ base, slug: toKebabCase(base) }))
	.filter(({ base, slug }) => toPascalCase(slug) === base)
	.map(({ slug }) => slug)
	.sort();
