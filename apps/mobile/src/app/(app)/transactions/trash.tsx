import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  TrashIcon,
} from 'phosphor-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { BrandColors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useTheme } from '@/hooks/use-theme';
import { formatCents } from '@/lib/money';
import { type Transaction, transactionsApi } from '@/lib/transactions-api';

const TRASH_QUERY_KEY = (workspaceId: string | null | undefined) =>
  ['transactions', workspaceId, { deletedOnly: true }] as const;

function TrashRow({
  transaction,
  workspaceId,
}: {
  transaction: Transaction;
  workspaceId: string;
}) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const isExpense = transaction.type === 'expense';

  const restoreMutation = useMutation({
    mutationFn: () => transactionsApi.restore(workspaceId, transaction.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRASH_QUERY_KEY(workspaceId) });
      queryClient.invalidateQueries({
        queryKey: ['transactions', workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ['summary', workspaceId] });
    },
  });

  return (
    <Card className="flex-row items-center justify-between">
      <View className="flex-1 gap-0.5 pr-3">
        <ThemedText type="smallBold" numberOfLines={1}>
          {transaction.description}
        </ThemedText>
        <View className="flex-row items-center gap-2">
          <ThemedText type="small" themeColor="textSecondary">
            {transaction.date.split('-').reverse().join('/')}
          </ThemedText>
          <ThemedText
            type="smallBold"
            style={{ color: isExpense ? '#DC2626' : '#16A34A' }}
          >
            {isExpense ? '-' : '+'}
            {formatCents(transaction.amount)}
          </ThemedText>
        </View>
      </View>
      <Button
        size="sm"
        variant="secondary"
        loading={restoreMutation.isPending}
        icon={
          <ArrowCounterClockwiseIcon
            size={16}
            weight="bold"
            color={theme.text}
          />
        }
        onPress={() => restoreMutation.mutate()}
      >
        Restaurar
      </Button>
    </Card>
  );
}

export default function TransactionsTrashScreen() {
  const theme = useTheme();
  const { workspaceId } = useSession();

  const { data: transactions, isLoading } = useQuery({
    queryKey: TRASH_QUERY_KEY(workspaceId),
    queryFn: () =>
      transactionsApi.list(workspaceId!, { deletedOnly: true, limit: 50 }),
    enabled: Boolean(workspaceId),
  });

  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="active:opacity-60"
        >
          <ArrowLeftIcon size={22} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">Lixeira</ThemedText>
      </View>

      {isLoading ? (
        <ActivityIndicator />
      ) : transactions && transactions.length > 0 ? (
        <View className="gap-2">
          {transactions.map((transaction) => (
            <TrashRow
              key={transaction.id}
              transaction={transaction}
              workspaceId={workspaceId!}
            />
          ))}
        </View>
      ) : (
        <Card className="items-center gap-3 py-10">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <TrashIcon size={22} color={BrandColors.primary} />
          </View>
          <ThemedText type="smallBold">Nenhuma transação excluída</ThemedText>
        </Card>
      )}
    </Screen>
  );
}
