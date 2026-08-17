import * as PhosphorIcons from 'phosphor-react-native';
import { type IconProps, TagIcon } from 'phosphor-react-native';
import type { ComponentType } from 'react';

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
 * "Confetti") — mesma lista do dashboard (lib/category-icon.ts).
 */
const ICON_ALIASES: Record<string, string> = {
  home: 'House',
  'party-popper': 'Confetti',
  'heart-pulse': 'Heartbeat',
  banknote: 'Money',
  'circle-ellipsis': 'DotsThreeCircle',
};

/**
 * `Category.icon` é um slug livre (ex.: "shopping-cart", vindo do placeholder do form) que nunca
 * foi de fato resolvido pra um ícone — aqui ele vira o nome do componente Phosphor equivalente
 * ("ShoppingCartIcon"). Sem match no pacote, cai no ícone genérico.
 */
export function resolveCategoryIcon(
  icon: string | null | undefined
): ComponentType<IconProps> {
  if (!icon) return TagIcon;
  const componentName = `${ICON_ALIASES[icon] ?? toPascalCase(icon)}Icon`;
  const Icon = (
    PhosphorIcons as unknown as Record<
      string,
      ComponentType<IconProps> | undefined
    >
  )[componentName];
  return Icon ?? TagIcon;
}

/**
 * Todas as opções do pacote instalado, derivadas em runtime (não hardcoded) —
 * cada nome exportado ("AcornIcon", "ZoomInIcon", ...) vira um slug
 * kebab-case, mas só entra na lista se o slug voltar a resolver pro mesmo
 * componente (round-trip `toPascalCase(slug) === nome`) — garante que todo
 * item do picker realmente renderiza um ícone, nunca o fallback genérico.
 * Mesma derivação do dashboard (lib/category-icon.ts), pro picker de ícone.
 */
export const CATEGORY_ICON_OPTIONS: string[] = Object.keys(PhosphorIcons)
  .filter((name) => name.endsWith('Icon'))
  .map((name) => name.slice(0, -'Icon'.length))
  .map((base) => ({ base, slug: toKebabCase(base) }))
  .filter(({ base, slug }) => toPascalCase(slug) === base)
  .map(({ slug }) => slug)
  .sort();
