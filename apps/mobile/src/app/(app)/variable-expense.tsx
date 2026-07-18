import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeftIcon, ChartLineUpIcon } from 'phosphor-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { formatCents } from '@/lib/money';
import { summaryApi } from '@/lib/summary-api';

/** Estimativa de gasto variável por categoria (M2-08) — média dos últimos 3 meses completos. */
export default function VariableExpenseScreen() {
  const { workspaceId } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ['variable-expense-estimate', workspaceId],
    queryFn: () => summaryApi.getVariableExpenseEstimate(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const byCategory = [...(data?.byCategory ?? [])].sort((a, b) => b.estimated - a.estimated);

  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Gasto variável</ThemedText>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Média dos últimos 3 meses por categoria — só o que não é recorrência nem parcela.
        Usado pra estimar o disponível projetado do mês.
      </ThemedText>

      {isLoading ? (
        <ActivityIndicator className="mt-4 self-start" />
      ) : (
        <>
          <Card className="items-center gap-2 py-6">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <ChartLineUpIcon size={18} color="#2563EB" />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Estimado por mês
            </ThemedText>
            <ThemedText type="title">{formatCents(data?.total ?? 0)}</ThemedText>
          </Card>

          {byCategory.length > 0 ? (
            <View className="gap-2">
              {byCategory.map((c) => (
                <Card key={c.categoryId} className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <ThemedText type="smallBold">{c.name}</ThemedText>
                  </View>
                  <ThemedText type="smallBold">{formatCents(c.estimated)}</ThemedText>
                </Card>
              ))}
            </View>
          ) : (
            <Card className="items-center py-6">
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                Sem histórico suficiente ainda — a estimativa aparece depois de alguns meses de uso.
              </ThemedText>
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
