import {
  TargetIcon,
  TrendDownIcon,
  TrendUpIcon,
  WalletIcon,
} from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { BrandColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCents } from '@/lib/money';
import type { MonthlySummary } from '@/lib/summary-api';

/**
 * Grade 2x2 de indicadores da Home — mesmas 4 métricas do card de stats da
 * Home do dashboard (Saldo total / Receitas / Despesas / Disponível
 * projetado), pra manter as duas equivalentes. Só na Home: o resumo
 * compacto de Transações (BalanceOverview) continua como está, sem
 * concorrer por espaço com a lista de lançamentos logo abaixo.
 *
 * Ícone sempre no tom discreto do rótulo (nunca a cor da marca) — no
 * dashboard o ícone herda o `text-muted-foreground` do `<p>` que o envolve,
 * só o VALOR (não o ícone) ganha cor em Receitas/Despesas. Um ícone teal em
 * toda célula competiria com o número, que é a informação que importa.
 */
function StatTile({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <View className="flex-1 gap-1 rounded-lg border border-foreground/10 p-4">
      <View className="flex-row items-center gap-1.5">
        <Icon size={15} color={theme.textSecondary} />
        <Text className="text-[12px] font-normal leading-tight text-muted-foreground">
          {label}
        </Text>
      </View>
      <Text
        className="text-[20px] font-semibold leading-tight text-foreground"
        style={color ? { color } : undefined}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

export function HomeStatGrid({
  summary,
}: {
  summary: MonthlySummary | undefined;
}) {
  return (
    <View className="w-full gap-3 px-4">
      <View className="flex-row gap-3">
        <StatTile
          icon={WalletIcon}
          label="Saldo total"
          value={formatCents(summary?.totalBalance ?? 0)}
        />
        <StatTile
          icon={TrendUpIcon}
          label="Receitas"
          value={formatCents(summary?.income ?? 0)}
          color={BrandColors.success}
        />
      </View>
      <View className="flex-row gap-3">
        <StatTile
          icon={TrendDownIcon}
          label="Despesas"
          value={formatCents(summary?.expense ?? 0)}
          color={BrandColors.destructive}
        />
        <StatTile
          icon={TargetIcon}
          label="Disponível projetado"
          value={
            summary?.projectedAvailable != null
              ? formatCents(summary.projectedAvailable)
              : '—'
          }
        />
      </View>
    </View>
  );
}
