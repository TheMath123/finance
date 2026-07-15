import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ArchiveIcon,
  ArrowsClockwiseIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  ReceiptIcon,
  TrashIcon,
} from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';

import { CreateRecurringForm } from '@/components/forms/create-recurring-form';
import { CreateTransactionForm } from '@/components/forms/create-transaction-form';
import { EditTransactionForm } from '@/components/forms/edit-transaction-form';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Select } from '@/components/ui/select';
import { useSession } from '@/context/session';
import { useCategories } from '@/lib/hooks/use-categories';
import { formatCents } from '@/lib/money';
import { recurringApi, type PendingOccurrence, type RecurringTransaction } from '@/lib/recurring-api';
import { transactionsApi, type Transaction } from '@/lib/transactions-api';

const ALL_CATEGORIES_VALUE = '';

const FREQUENCY_LABELS: Record<RecurringTransaction['frequency'], string> = {
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

function TransactionRow({
  transaction,
  onPress,
  onDelete,
}: {
  transaction: Transaction;
  onPress: () => void;
  onDelete: () => void;
}) {
  const isExpense = transaction.type === 'expense';

  return (
    <Pressable onPress={onPress} className="active:opacity-70">
      <Card className="flex-row items-center justify-between">
        <View className="flex-1 gap-0.5 pr-3">
          <ThemedText type="smallBold" numberOfLines={1}>
            {transaction.description}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {transaction.date.split('-').reverse().join('/')}
          </ThemedText>
        </View>
        <View className="flex-row items-center gap-3">
          <ThemedText type="smallBold" style={{ color: isExpense ? '#DC2626' : '#16A34A' }}>
            {isExpense ? '-' : '+'}
            {formatCents(transaction.amount)}
          </ThemedText>
          <Pressable onPress={onDelete} hitSlop={8} className="active:opacity-60">
            <TrashIcon size={18} color="#DC2626" />
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );
}

function PendingOccurrenceRow({ occurrence, workspaceId }: { occurrence: PendingOccurrence; workspaceId: string }) {
  const queryClient = useQueryClient();
  const isExpense = occurrence.type === 'expense';

  const mutation = useMutation({
    mutationFn: () => recurringApi.confirmOccurrence(workspaceId, occurrence.recurringId, occurrence.date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['summary', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['recurring-pending', workspaceId] });
    },
  });

  return (
    <Card className="flex-row items-center justify-between">
      <View className="flex-1 gap-0.5 pr-3">
        <ThemedText type="smallBold" numberOfLines={1}>
          {occurrence.description}
        </ThemedText>
        <View className="flex-row items-center gap-2">
          <ThemedText type="small" themeColor="textSecondary">
            {occurrence.date.split('-').reverse().join('/')}
          </ThemedText>
          <ThemedText type="smallBold" style={{ color: isExpense ? '#DC2626' : '#16A34A' }}>
            {isExpense ? '-' : '+'}
            {formatCents(occurrence.amount)}
          </ThemedText>
        </View>
      </View>
      <Button size="sm" variant="secondary" loading={mutation.isPending} onPress={() => mutation.mutate()}>
        Confirmar
      </Button>
    </Card>
  );
}

function RecurringManagerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);

  const { data: recurring, isLoading } = useQuery({
    queryKey: ['recurring', workspaceId],
    queryFn: () => recurringApi.list(workspaceId!),
    enabled: Boolean(workspaceId) && open,
  });

  const deleteMutation = useMutation({
    mutationFn: (recurringId: string) => recurringApi.delete(workspaceId!, recurringId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['recurring-pending', workspaceId] });
    },
  });

  const handleDelete = (item: RecurringTransaction) => {
    Alert.alert(
      'Excluir recorrência',
      `Excluir "${item.description}"? As transações já confirmadas não são afetadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(item.id),
        },
      ],
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader className="flex-row items-center justify-between pb-4">
            <DialogTitle>Recorrências</DialogTitle>
            <Pressable
              onPress={() => setCreateOpen(true)}
              className="h-9 w-9 items-center justify-center rounded-full bg-primary active:opacity-80">
              <PlusIcon size={18} color="#FFFFFF" weight="bold" />
            </Pressable>
          </DialogHeader>

          {isLoading ? (
            <ActivityIndicator className="mt-4" />
          ) : recurring && recurring.length > 0 ? (
            <View className="gap-2">
              {recurring.map((item) => (
                <Card key={item.id} className={!item.active ? 'opacity-50' : undefined}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 gap-0.5 pr-3">
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {item.description}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {FREQUENCY_LABELS[item.frequency]}
                        {!item.active ? ' · Inativa' : ''}
                      </ThemedText>
                    </View>
                    <View className="flex-row items-center gap-3">
                      <ThemedText type="smallBold" style={{ color: item.type === 'expense' ? '#DC2626' : '#16A34A' }}>
                        {item.type === 'expense' ? '-' : '+'}
                        {formatCents(item.amount)}
                      </ThemedText>
                      <Pressable onPress={() => setEditingRecurring(item)} hitSlop={8} className="active:opacity-60">
                        <PencilIcon size={18} color="#71717a" />
                      </Pressable>
                      <Pressable onPress={() => handleDelete(item)} hitSlop={8} className="active:opacity-60">
                        <TrashIcon size={18} color="#DC2626" />
                      </Pressable>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Nenhuma recorrência cadastrada.
            </ThemedText>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova recorrência</DialogTitle>
          </DialogHeader>
          <CreateRecurringForm onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingRecurring)} onOpenChange={(open) => !open && setEditingRecurring(null)}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar recorrência</DialogTitle>
          </DialogHeader>
          {editingRecurring && (
            <CreateRecurringForm recurring={editingRecurring} onDone={() => setEditingRecurring(null)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function TransactionsScreen() {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [recurringManagerOpen, setRecurringManagerOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES_VALUE);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: categories } = useCategories(workspaceId);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', workspaceId, { q: debouncedSearch, categoryId: categoryFilter }],
    queryFn: () =>
      transactionsApi.list(workspaceId!, {
        limit: 50,
        q: debouncedSearch || undefined,
        categoryId: categoryFilter || undefined,
      }),
    enabled: Boolean(workspaceId),
  });

  const deleteMutation = useMutation({
    mutationFn: (transactionId: string) => transactionsApi.delete(workspaceId!, transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['summary', workspaceId] });
    },
  });

  const handleDelete = (transaction: Transaction) => {
    Alert.alert('Excluir transação', `Excluir "${transaction.description}"? Essa ação pode ser desfeita depois.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(transaction.id),
      },
    ]);
  };

  const categoryOptions = [
    { label: 'Todas as categorias', value: ALL_CATEGORIES_VALUE },
    ...(categories ?? []).map((c) => ({ label: c.name, value: c.id })),
  ];

  const now = new Date();
  const { data: pending } = useQuery({
    queryKey: ['recurring-pending', workspaceId, now.getFullYear(), now.getMonth() + 1],
    queryFn: () => recurringApi.listPending(workspaceId!, now.getFullYear(), now.getMonth() + 1),
    enabled: Boolean(workspaceId),
  });

  return (
    <Screen className="gap-4 pb-28">
      <View className="flex-row items-center justify-between">
        <ThemedText type="subtitle">Transações</ThemedText>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => router.push('/transactions/trash')}
            className="h-9 w-9 items-center justify-center rounded-full bg-muted active:opacity-80">
            <ArchiveIcon size={18} weight="bold" />
          </Pressable>
          <Pressable
            onPress={() => setRecurringManagerOpen(true)}
            className="h-9 w-9 items-center justify-center rounded-full bg-muted active:opacity-80">
            <ArrowsClockwiseIcon size={18} weight="bold" />
          </Pressable>
          <Pressable
            onPress={() => setCreateOpen(true)}
            className="h-9 w-9 items-center justify-center rounded-full bg-primary active:opacity-80">
            <PlusIcon size={18} color="#FFFFFF" weight="bold" />
          </Pressable>
        </View>
      </View>

      <Input
        placeholder="Buscar por descrição"
        value={search}
        onChangeText={setSearch}
        leadingIcon={<MagnifyingGlassIcon size={18} color="#71717a" />}
      />

      <Select
        placeholder="Todas as categorias"
        options={categoryOptions}
        value={categoryFilter}
        onValueChange={setCategoryFilter}
      />

      {pending && pending.length > 0 && (
        <View className="gap-2">
          <ThemedText type="smallBold" themeColor="textSecondary">
            Recorrências pendentes deste mês
          </ThemedText>
          {pending.map((occurrence) => (
            <PendingOccurrenceRow
              key={`${occurrence.recurringId}-${occurrence.date}`}
              occurrence={occurrence}
              workspaceId={workspaceId!}
            />
          ))}
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : transactions && transactions.length > 0 ? (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-2"
          renderItem={({ item }) => (
            <TransactionRow
              transaction={item}
              onPress={() => setEditingTransaction(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
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

      <RecurringManagerDialog open={recurringManagerOpen} onOpenChange={setRecurringManagerOpen} />

      <Dialog open={Boolean(editingTransaction)} onOpenChange={(open) => !open && setEditingTransaction(null)}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar transação</DialogTitle>
          </DialogHeader>
          {editingTransaction && (
            <EditTransactionForm
              transaction={editingTransaction}
              onDone={() => setEditingTransaction(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Screen>
  );
}
