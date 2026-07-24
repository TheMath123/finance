import React from 'react';
import { Pressable, type PressableProps } from 'react-native';

import { cn } from '@/lib/cn';

export interface HeaderChipProps extends PressableProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Pílula translúcida (teal 10%, radius 4px) usada pra tudo no cabeçalho das telas no Figma:
 * seletor de workspace, select de categoria, botão de filtro, recorrências, arquivadas — todos a
 * mesma instância de componente no design, só variando se tem texto ou só ícone.
 */
export function HeaderChip({ className, children, ...props }: HeaderChipProps) {
  return (
    <Pressable
      className={cn('flex-row items-center justify-center gap-2.5 rounded bg-primary/10 px-2 py-1.5 active:opacity-70', className)}
      accessibilityRole="button"
      {...props}>
      {children}
    </Pressable>
  );
}
