import { pickContrastColor } from '@finance/shared';
import type { IconProps } from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { View } from 'react-native';

export interface CategoryBadgeProps {
  /** Cor de fundo da bolinha (ex.: `category.color`). */
  color: string;
  icon: ComponentType<IconProps>;
  /** Diâmetro da bolinha em px. */
  size?: number;
  iconSize?: number;
}

/**
 * Bolinha colorida com ícone dentro — mesmo padrão do dashboard
 * (categorias, ComboSelect). A cor do ícone nunca é fixa: `pickContrastColor`
 * (`@finance/shared`, baseado em `culori`) escolhe preto ou branco pelo
 * contraste WCAG real contra a cor de fundo escolhida pelo usuário — um
 * ícone branco fixo (o que existia antes) fica ilegível em cores claras
 * (ex.: o próprio teal da marca falha WCAG contra branco).
 */
export function CategoryBadge({
  color,
  icon: Icon,
  size = 36,
  iconSize,
}: CategoryBadgeProps) {
  const iconColor = pickContrastColor(color);
  return (
    <View
      style={{
        height: size,
        width: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon
        size={iconSize ?? Math.round(size * 0.55)}
        color={iconColor}
        weight="fill"
      />
    </View>
  );
}
