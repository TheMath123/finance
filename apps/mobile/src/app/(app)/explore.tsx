import { useQuery } from '@tanstack/react-query';
import { PlusIcon, ReceiptIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

import { CreateTransactionForm } from '@/components/forms/create-transaction-form';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { formatCents } from '@/lib/money';
import { transactionsApi, type Transaction } from '@/lib/transactions-api';

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isExpense = transaction.type === 'expense';

  return (
    <Card className="flex-row items-center justify-between">
      <View className="flex-1 gap-0.5 pr-3">
        <ThemedText type="smallBold" numberOfLines={1}>
          {transaction.description}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {transaction.date.split('-').reverse().join('/')}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" style={{ color: isExpense ? '#DC2626' : '#16A34A' }}>
        {isExpense ? '-' : '+'}
        {formatCents(transaction.amount)}
      </ThemedText>
    </Card>
  );
}

export default function TransactionsScreen() {
  const { workspaceId } = useSession();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', workspaceId],
    queryFn: () => transactionsApi.list(workspaceId!, { limit: 50 }),
    enabled: Boolean(workspaceId),
  });

  return (
    <Screen className="gap-4 pb-28">
      <View className="flex-row items-center justify-between">
        <ThemedText type="subtitle">Transações</ThemedText>
        <Pressable
          onPress={() => setCreateOpen(true)}
          className="h-9 w-9 items-center justify-center rounded-full bg-primary active:opacity-80">
          <PlusIcon size={18} color="#FFFFFF" weight="bold" />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : transactions && transactions.length > 0 ? (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-2"
          renderItem={({ item }) => <TransactionRow transaction={item} />}
        />
      ) : (
        <Card className="items-center gap-3 py-10">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ReceiptIcon size={22} color="#2563EB" />
          </View>
          <ThemedText type="smallBold">Nenhuma transação ainda</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
            Lançamentos de contas e cartões deste workspace aparecem aqui.
          </ThemedText>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova transação</DialogTitle>
          </DialogHeader>
          <CreateTransactionForm onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </Screen>
  );
}
