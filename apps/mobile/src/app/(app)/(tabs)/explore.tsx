import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ArchiveIcon,
  ArrowsClockwiseIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  ReceiptIcon,
  TrashIcon,
  XIcon,
} from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';

import { formatIsoDate } from '@/components/form/date-field';
import { CreateRecurringForm } from '@/components/forms/create-recurring-form';
import { CreateTransactionForm } from '@/components/forms/create-transaction-form';
import { EditTransactionForm } from '@/components/forms/edit-transaction-form';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Select } from '@/components/ui/select';
import { useSession } from '@/context/session';
import { accountsApi } from '@/lib/accounts-api';
import { cardsApi } from '@/lib/cards-api';
import { cn } from '@/lib/cn';
import { useCategories } from '@/lib/hooks/use-categories';
import { formatCents } from '@/lib/money';
import { recurringApi, type PendingOccurrence, type RecurringTransaction } from '@/lib/recurring-api';
import { transactionsApi, type Transaction } from '@/lib/transactions-api';

const ALL_CATEGORIES_VALUE = '';
const ALL_ACCOUNTS_VALUE = '';
const ALL_CARDS_VALUE = '';

const FREQUENCY_LABELS: Record<RecurringTransaction['frequency'], string> = {
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

function TransactionRow({ transaction, onPress }: { transaction: Transaction; onPress: () => void }) {
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
        <ThemedText type="smallBold" style={{ color: isExpense ? '#DC2626' : '#16A34A' }}>
          {isExpense ? '-' : '+'}
          {formatCents(transaction.amount)}
        </ThemedText>
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
  const [accountFilter, setAccountFilter] = useState(ALL_ACCOUNTS_VALUE);
  const [cardFilter, setCardFilter] = useState(ALL_CARDS_VALUE);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: categories } = useCategories(workspaceId);
  const { data: accounts } = useQuery({
    queryKey: ['accounts', workspaceId],
    queryFn: () => accountsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });
  const { data: cards } = useQuery({
    queryKey: ['cards', workspaceId],
    queryFn: () => cardsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const isoFrom = dateFrom ? formatIsoDate(dateFrom) : undefined;
  const isoTo = dateTo ? formatIsoDate(dateTo) : undefined;
  const hasAdvancedFilters = Boolean(accountFilter || cardFilter || isoFrom || isoTo);

  const { data: transactions, isLoading } = useQuery({
    queryKey: [
      'transactions',
      workspaceId,
      { q: debouncedSearch, categoryId: categoryFilter, accountId: accountFilter, cardId: cardFilter, from: isoFrom, to: isoTo },
    ],
    queryFn: () =>
      transactionsApi.list(workspaceId!, {
        limit: 50,
        q: debouncedSearch || undefined,
        categoryId: categoryFilter || undefined,
        accountId: accountFilter || undefined,
        cardId: cardFilter || undefined,
        from: isoFrom,
        to: isoTo,
      }),
    enabled: Boolean(workspaceId),
  });

  const deleteMutation = useMutation({
    mutationFn: (transactionId: string) => transactionsApi.delete(workspaceId!, transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['summary', workspaceId] });
      setEditingTransaction(null);
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
  const accountOptions = [
    { label: 'Todas as contas', value: ALL_ACCOUNTS_VALUE },
    ...(accounts ?? []).map((a) => ({ label: a.name, value: a.id })),
  ];
  const cardOptions = [
    { label: 'Todos os cartões', value: ALL_CARDS_VALUE },
    ...(cards ?? []).map((c) => ({ label: c.name, value: c.id })),
  ];

  const clearAdvancedFilters = () => {
    setAccountFilter(ALL_ACCOUNTS_VALUE);
    setCardFilter(ALL_CARDS_VALUE);
    setDateFrom(undefined);
    setDateTo(undefined);
  };

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
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Transações arquivadas"
            className="h-10 w-10 items-center justify-center rounded-full border border-border bg-muted active:opacity-70">
            <ArchiveIcon size={18} weight="bold" />
          </Pressable>
          <Pressable
            onPress={() => setRecurringManagerOpen(true)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Recorrências"
            className="h-10 w-10 items-center justify-center rounded-full border border-border bg-muted active:opacity-70">
            <ArrowsClockwiseIcon size={18} weight="bold" />
          </Pressable>
        </View>
      </View>

      <Input
        placeholder="Buscar por descrição"
        value={search}
        onChangeText={setSearch}
        leadingIcon={<MagnifyingGlassIcon size={18} color="#71717a" />}
      />

      <View className="flex-row items-center gap-2">
        <Select
          className="flex-1"
          placeholder="Todas as categorias"
          options={categoryOptions}
          value={categoryFilter}
          onValueChange={setCategoryFilter}
        />
        <Pressable
          onPress={() => setFiltersOpen((prev) => !prev)}
          className={cn(
            'h-12 w-12 items-center justify-center rounded-lg border border-input bg-background active:opacity-70',
            filtersOpen && 'bg-accent/30',
          )}
          accessibilityRole="button"
          accessibilityLabel="Mais filtros">
          <FunnelIcon size={18} weight={hasAdvancedFilters ? 'fill' : 'regular'} color={hasAdvancedFilters ? '#2563EB' : '#71717a'} />
        </Pressable>
      </View>

      {filtersOpen && (
        <View className="gap-2 rounded-lg border border-border bg-muted/40 p-3">
          <View className="flex-row items-center justify-between">
            <ThemedText type="smallBold" themeColor="textSecondary">
              Período e conta/cartão
            </ThemedText>
            {hasAdvancedFilters && (
              <Pressable onPress={clearAdvancedFilters} hitSlop={8} className="flex-row items-center gap-1 active:opacity-60">
                <XIcon size={12} color="#71717a" />
                <ThemedText type="small" themeColor="textSecondary">
                  Limpar
                </ThemedText>
              </Pressable>
            )}
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1 gap-1">
              <ThemedText type="small" themeColor="textSecondary">
                De
              </ThemedText>
              <DatePicker
                placeholder="Início"
                value={dateFrom}
                onChange={setDateFrom}
                max={dateTo}
                formatDate={(d) => d.toLocaleDateString('pt-BR')}
              />
            </View>
            <View className="flex-1 gap-1">
              <ThemedText type="small" themeColor="textSecondary">
                Até
              </ThemedText>
              <DatePicker
                placeholder="Fim"
                value={dateTo}
                onChange={setDateTo}
                min={dateFrom}
                formatDate={(d) => d.toLocaleDateString('pt-BR')}
              />
            </View>
          </View>

          <Select
            placeholder="Todas as contas"
            options={accountOptions}
            value={accountFilter}
            onValueChange={setAccountFilter}
          />
          <Select
            placeholder="Todos os cartões"
            options={cardOptions}
            value={cardFilter}
            onValueChange={setCardFilter}
          />
        </View>
      )}

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
            <TransactionRow transaction={item} onPress={() => setEditingTransaction(item)} />
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
              onDelete={() => handleDelete(editingTransaction)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Pressable
        onPress={() => setCreateOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Nova transação"
        className="absolute bottom-24 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-80"
        style={{ elevation: 4 }}>
        <PlusIcon size={24} color="#FFFFFF" weight="bold" />
      </Pressable>
    </Screen>
  );
}
