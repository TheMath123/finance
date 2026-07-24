import {
  CaretRightIcon,
  TrendDownIcon,
  TrendUpIcon,
} from 'phosphor-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { BrandColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCents } from '@/lib/money';
import type { MonthlySummary } from '@/lib/summary-api';

/**
 * Bloco "saldo disponível + receitas/despesas" — mesmo componente reaproveitado no Figma tanto na
 * Home quanto na tela de Transações (mesma instância nos dois frames), então vira compartilhado
 * aqui também em vez de duplicar o JSX nas duas telas.
 */
export function BalanceOverview({
  summary,
}: {
  summary: MonthlySummary | undefined;
}) {
  const theme = useTheme();
  const balance = summary?.projectedAvailable ?? summary?.totalBalance ?? 0;

  return (
    <View className="w-full gap-4">
      <View className="w-full flex-row items-center justify-center px-4 py-3.5">
        <View className="flex-1 gap-2.5">
          <Text className="text-[10px] font-semibold leading-tight text-foreground">
            Saldo disponível
          </Text>
          <Text className="text-[20px] font-normal leading-tight text-foreground">
            {formatCents(balance)}
          </Text>
        </View>
        <CaretRightIcon size={14} weight="bold" color={theme.textSecondary} />
      </View>

      <View className="w-full flex-row gap-4 px-4">
        <View className="flex-1 flex-row items-center gap-4 rounded-lg border border-foreground/10 p-4">
          <TrendUpIcon size={16} color={BrandColors.success} />
          <View className="gap-1">
            <Text className="text-[10px] font-semibold leading-tight text-foreground">
              Receitas
            </Text>
            <Text className="text-[16px] font-normal leading-tight text-foreground">
              {formatCents(summary?.income ?? 0)}
            </Text>
          </View>
        </View>
        <View className="flex-1 flex-row items-center gap-4 rounded-lg border border-foreground/10 p-4">
          <TrendDownIcon size={16} color={BrandColors.destructive} />
          <View className="gap-1">
            <Text className="text-[10px] font-semibold leading-tight text-foreground">
              Despesas
            </Text>
            <Text className="text-[16px] font-normal leading-tight text-foreground">
              {formatCents(summary?.expense ?? 0)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
