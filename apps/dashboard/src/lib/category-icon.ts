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
 * Opções curadas pro picker visual de ícone (categorias padrão do
 * superadmin, M4-08) — todas verificadas contra o pacote instalado, sem
 * cair no fallback genérico.
 */
export const CATEGORY_ICON_OPTIONS = [
	'shopping-cart',
	'car',
	'home',
	'party-popper',
	'heart-pulse',
	'graduation-cap',
	'repeat',
	'banknote',
	'circle-ellipsis',
	'airplane',
	'bus',
	'train',
	'gas-pump',
	'wrench',
	'gift',
	'book-open',
	'dog',
	'baby',
	'first-aid-kit',
	'pill',
	'tooth',
	'hamburger',
	'coffee',
	'wine',
	't-shirt',
	'wallet',
	'credit-card',
	'piggy-bank',
	'hand-coins',
	'currency-dollar',
	'chart-line-up',
	'briefcase',
	'laptop',
	'phone',
	'wifi-high',
	'television',
	'game-controller',
	'film-strip',
	'music-notes',
	'paw-print',
	'tree',
	'sun',
	'umbrella',
	'scissors',
	'bank',
	'cake',
	'palette',
	'camera',
	'book'
] as const;
