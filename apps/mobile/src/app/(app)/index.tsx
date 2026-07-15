import { useQuery } from '@tanstack/react-query';
import { TrendUpIcon, TrendDownIcon } from 'phosphor-react-native';
import { ActivityIndicator, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { formatCents } from '@/lib/money';
import { summaryApi } from '@/lib/summary-api';

export default function HomeScreen() {
  const { workspaceId } = useSession();
  const now = new Date();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['summary', workspaceId, now.getFullYear(), now.getMonth() + 1],
    queryFn: () => summaryApi.getMonthly(workspaceId!, now.getFullYear(), now.getMonth() + 1),
    enabled: Boolean(workspaceId),
  });

  return (
    <Screen className="gap-6 pb-28">
      <View>
        <ThemedText type="small" themeColor="textSecondary">
          Saldo disponível
        </ThemedText>
        {isLoading ? (
          <ActivityIndicator className="mt-2 self-start" />
        ) : (
          <ThemedText type="title">
            {formatCents(summary?.projectedAvailable ?? summary?.totalBalance ?? 0)}
          </ThemedText>
        )}
      </View>

      <View className="flex-row gap-3">
        <Card className="flex-1 flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-green-500/15">
            <TrendUpIcon size={18} color="#16A34A" weight="bold" />
          </View>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              Receitas
            </ThemedText>
            <ThemedText type="smallBold">{formatCents(summary?.income ?? 0)}</ThemedText>
          </View>
        </Card>

        <Card className="flex-1 flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-red-500/15">
            <TrendDownIcon size={18} color="#DC2626" weight="bold" />
          </View>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              Despesas
            </ThemedText>
            <ThemedText type="smallBold">{formatCents(summary?.expense ?? 0)}</ThemedText>
          </View>
        </Card>
      </View>

      <Card className="items-center gap-2 py-8">
        <ThemedText type="smallBold">Nenhuma fatura este mês</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          Suas próximas faturas de cartão aparecem aqui.
        </ThemedText>
      </Card>
    </Screen>
  );
}
