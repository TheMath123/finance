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

/**
 * `Category.icon` é um slug livre (ex.: "shopping-cart", vindo do placeholder do form) que nunca
 * foi de fato resolvido pra um ícone — aqui ele vira o nome do componente Phosphor equivalente
 * ("ShoppingCartIcon"). Sem match no pacote, cai no ícone genérico.
 */
export function resolveCategoryIcon(
  icon: string | null | undefined
): ComponentType<IconProps> {
  if (!icon) return TagIcon;
  const componentName = `${toPascalCase(icon)}Icon`;
  const Icon = (
    PhosphorIcons as unknown as Record<
      string,
      ComponentType<IconProps> | undefined
    >
  )[componentName];
  return Icon ?? TagIcon;
}
