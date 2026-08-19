import type { TransactionMethod } from '@finance/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  CalculatorIcon,
  CaretDownIcon,
  FunnelIcon,
  FunnelXIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  ReceiptIcon,
  RepeatIcon,
  TrashIcon,
  UploadSimpleIcon,
  XIcon,
} from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  View,
} from 'react-native';
import { BalanceOverview } from '@/components/finance/balance-overview';
import { HeaderChip } from '@/components/finance/header-chip';
import { PinnedFormulas } from '@/components/finance/pinned-formulas';
import { formatIsoDate } from '@/components/form/date-field';
import { CreateRecurringForm } from '@/components/forms/create-recurring-form';
import { CreateTransactionForm } from '@/components/forms/create-transaction-form';
import { EditTransactionForm } from '@/components/forms/edit-transaction-form';
import { ImportCsvForm } from '@/components/forms/import-csv-form';
import { ThemedText } from '@/components/themed-text';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Select } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { BrandColors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useTheme } from '@/hooks/use-theme';
import { type Account, accountsApi } from '@/lib/accounts-api';
import { ApiError } from '@/lib/api-client';
import { type Card as CardAccount, cardsApi } from '@/lib/cards-api';
import type { Category } from '@/lib/categories-api';
import { resolveCategoryIcon } from '@/lib/category-icons';
import { buildCategoryOptions } from '@/lib/category-select-options';
import { cn } from '@/lib/cn';
import { useCategories } from '@/lib/hooks/use-categories';
import { useRecurringPendingTotal } from '@/lib/hooks/use-recurring-pending-total';
import { getMerchantLogoUrl } from '@/lib/merchant-logo';
import { formatCents } from '@/lib/money';
import {
  type PendingOccurrence,
  type RecurringTransaction,
  recurringApi,
} from '@/lib/recurring-api';
import { summaryApi } from '@/lib/summary-api';
import { type Transaction, transactionsApi } from '@/lib/transactions-api';
import { workspaceApi } from '@/lib/workspace-api';

const ALL_CATEGORIES_VALUE = '';
const ALL_ACCOUNTS_VALUE = '';
const ALL_CARDS_VALUE = '';

const FREQUENCY_LABELS: Record<RecurringTransaction['frequency'], string> = {
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

const METHOD_LABELS: Record<TransactionMethod, string> = {
  pix: 'Pix',
  debit: 'Débito',
  cash: 'Dinheiro',
  credit: 'Cartão',
  transfer: 'Transferência',
};

/** Como o Figma mostra "Cartão Z"/"Conta A" em vez do método genérico quando dá pra identificar a origem exata. */
function transactionSourceLabel(
  transaction: Transaction,
  cardById: Map<string, CardAccount>,
  accountById: Map<string, Account>
): string {
  if (transaction.cardId)
    return cardById.get(transaction.cardId)?.name ?? METHOD_LABELS.credit;
  if (transaction.method === 'transfer' && transaction.accountId) {
    return (
      accountById.get(transaction.accountId)?.name ?? METHOD_LABELS.transfer
    );
  }
  return METHOD_LABELS[transaction.method];
}

/**
 * Estilo de pílula do Figma aplicado só no `DatePicker` (De/Até): esse componente aplica o
 * `className` numa única `Pressable`, então dá pra sobrescrever com segurança. O `Select`
 * (categoria/conta/cartão) aplica o mesmo `className` em dois elementos ao mesmo tempo (a `View`
 * externa e o `Pressable` interno) — sobrescrever lá duplica padding/fundo e quebra o texto, por
 * isso os `Select` ficam com a aparência padrão do componente nesta tela.
 */
const CHIP_FIELD_CLASSNAME =
  'min-h-0 rounded-lg border border-primary/30 bg-transparent px-4 py-2';

function TransactionRow({
  transaction,
  category,
  sourceLabel,
  onPress,
}: {
  transaction: Transaction;
  category: Category | undefined;
  sourceLabel: string;
  onPress: () => void;
}) {
  const isExpense = transaction.type === 'expense';
  const isInstallment = transaction.installmentTotal !== null;
  const locked = transaction.invoicePaid === true;
  const Icon = resolveCategoryIcon(category?.icon);
  const accentColor = isExpense ? BrandColors.destructive : BrandColors.success;
  const logoUrl = getMerchantLogoUrl(transaction.description);
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = logoUrl !== null && !logoFailed;

  return (
    <Pressable
      onPress={() => {
        if (locked) {
          Alert.alert(
            'Fatura já paga',
            'Esta transação não pode mais ser editada. Arquive-a e lance uma nova.'
          );
          return;
        }
        onPress();
      }}
      className={cn(
        'w-full flex-row gap-2 border-t border-foreground/10 px-4 py-5 active:opacity-70',
        locked && 'opacity-60'
      )}
    >
      <View
        className={cn(
          'h-10 w-10 items-center justify-center rounded-full',
          isExpense ? 'bg-destructive/10' : 'bg-success/10'
        )}
      >
        {showLogo ? (
          <Image
            source={{ uri: logoUrl }}
            style={{ width: 20, height: 20 }}
            contentFit="contain"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          // resolveCategoryIcon escolhe entre ícones Phosphor já existentes (não cria nada novo);
          // trocar de ícone conforme a categoria é intencional, sem estado interno a perder.
          // eslint-disable-next-line react-hooks/static-components
          <Icon size={16} color={accentColor} />
        )}
      </View>
      <View className="flex-1 flex-row items-center gap-2.5">
        <View className="flex-1 gap-2">
          <Text
            className="text-[12px] font-normal leading-tight text-foreground"
            numberOfLines={1}
          >
            {transaction.description}
          </Text>
          <Text
            className="text-[12px] font-normal leading-tight text-muted-foreground"
            numberOfLines={1}
          >
            {sourceLabel} • {transaction.date.split('-').reverse().join('/')}
          </Text>
        </View>
        <View className="items-end gap-2">
          {isInstallment && (
            <Text
              className="text-[12px] font-normal leading-tight text-muted-foreground"
              numberOfLines={1}
            >
              {formatCents(
                transaction.amount * (transaction.installmentTotal ?? 1)
              )}{' '}
              • {transaction.installmentNumber}/{transaction.installmentTotal}
            </Text>
          )}
          {!isInstallment && transaction.hasActiveSplit && (
            <Text className="text-[12px] font-normal leading-tight text-muted-foreground">
              Dividido
            </Text>
          )}
          {locked && (
            <Text className="text-[12px] font-normal leading-tight text-muted-foreground">
              Fatura paga
            </Text>
          )}
          <Text
            className="text-[14px] font-medium leading-tight"
            style={{ color: accentColor }}
          >
            {isExpense ? '- ' : ''}
            {formatCents(transaction.amount)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function PendingOccurrenceRow({
  occurrence,
  workspaceId,
}: {
  occurrence: PendingOccurrence;
  workspaceId: string;
}) {
  const queryClient = useQueryClient();
  const isExpense = occurrence.type === 'expense';

  const mutation = useMutation({
    mutationFn: () =>
      recurringApi.confirmOccurrence(
        workspaceId,
        occurrence.recurringId,
        occurrence.date
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['transactions', workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ['summary', workspaceId] });
      queryClient.invalidateQueries({
        queryKey: ['recurring-pending', workspaceId],
      });
    },
    // Sem isso, uma falha (ex.: ocorrência já confirmada por outro
    // dispositivo/sweep automático) não dava nenhum sinal — o botão só
    // parava de carregar e a linha continuava exatamente igual, parecendo
    // que "não confirma".
    onError: (err) => {
      if (!(err instanceof ApiError))
        console.error('[confirm occurrence]', err);
      Alert.alert(
        'Erro ao confirmar',
        err instanceof ApiError
          ? err.message
          : 'Não foi possível confirmar essa recorrência.'
      );
      queryClient.invalidateQueries({
        queryKey: ['recurring-pending', workspaceId],
      });
    },
  });

  return (
    <View className="w-full flex-row items-center justify-between gap-2 border-t border-foreground/10 px-4 py-5">
      <View className="flex-1 gap-2 pr-3">
        <Text
          className="text-[12px] font-normal leading-tight text-foreground"
          numberOfLines={1}
        >
          {occurrence.description}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-[12px] font-normal leading-tight text-muted-foreground">
            {occurrence.date.split('-').reverse().join('/')}
          </Text>
          <Text
            className="text-[14px] font-medium leading-tight"
            style={{
              color: isExpense ? BrandColors.destructive : BrandColors.success,
            }}
          >
            {isExpense ? '- ' : ''}
            {formatCents(occurrence.amount)}
          </Text>
        </View>
      </View>
      <Button
        size="sm"
        variant="secondary"
        loading={mutation.isPending}
        onPress={() => mutation.mutate()}
      >
        Confirmar
      </Button>
    </View>
  );
}

function RecurringManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] =
    useState<RecurringTransaction | null>(null);

  const { data: recurring, isLoading } = useQuery({
    queryKey: ['recurring', workspaceId],
    queryFn: () => recurringApi.list(workspaceId!),
    enabled: Boolean(workspaceId) && open,
  });

  const pendingTotal = useRecurringPendingTotal(workspaceId);

  const deleteMutation = useMutation({
    mutationFn: (recurringId: string) =>
      recurringApi.delete(workspaceId!, recurringId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring', workspaceId] });
      queryClient.invalidateQueries({
        queryKey: ['recurring-pending', workspaceId],
      });
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
      ]
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
              className="h-9 w-9 items-center justify-center rounded-full bg-primary active:opacity-80"
            >
              <PlusIcon size={18} color="#FFFFFF" weight="bold" />
            </Pressable>
          </DialogHeader>

          {pendingTotal && pendingTotal.count > 0 && (
            <View className="mb-3 flex-row gap-3 rounded-lg border border-border bg-muted/40 p-3">
              <View className="flex-1">
                <ThemedText type="small" themeColor="textSecondary">
                  A receber este mês
                </ThemedText>
                <ThemedText
                  type="smallBold"
                  style={{ color: BrandColors.success }}
                >
                  {formatCents(pendingTotal.income)}
                </ThemedText>
              </View>
              <View className="flex-1">
                <ThemedText type="small" themeColor="textSecondary">
                  A pagar este mês
                </ThemedText>
                <ThemedText
                  type="smallBold"
                  style={{ color: BrandColors.destructive }}
                >
                  {formatCents(pendingTotal.expense)}
                </ThemedText>
              </View>
            </View>
          )}

          {isLoading ? (
            <ActivityIndicator className="mt-4" />
          ) : recurring && recurring.length > 0 ? (
            <View className="gap-2">
              {recurring.map((item) => (
                <Card
                  key={item.id}
                  className={!item.active ? 'opacity-50' : undefined}
                >
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
                      <ThemedText
                        type="smallBold"
                        style={{
                          color:
                            item.type === 'expense'
                              ? BrandColors.destructive
                              : BrandColors.success,
                        }}
                      >
                        {item.type === 'expense' ? '-' : '+'}
                        {formatCents(item.amount)}
                      </ThemedText>
                      <Pressable
                        onPress={() => setEditingRecurring(item)}
                        hitSlop={8}
                        className="active:opacity-60"
                      >
                        <PencilIcon size={18} color={theme.textSecondary} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDelete(item)}
                        hitSlop={8}
                        className="active:opacity-60"
                      >
                        <TrashIcon size={18} color={BrandColors.destructive} />
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

      <Dialog
        open={Boolean(editingRecurring)}
        onOpenChange={(open) => !open && setEditingRecurring(null)}
      >
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar recorrência</DialogTitle>
          </DialogHeader>
          {editingRecurring && (
            <CreateRecurringForm
              recurring={editingRecurring}
              onDone={() => setEditingRecurring(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function TransactionsScreen() {
  const { workspaceId, featureFlags } = useSession();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [recurringManagerOpen, setRecurringManagerOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
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

  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceApi.listMine,
  });
  const activeWorkspace = workspaces?.find((w) => w.id === workspaceId);

  const now = new Date();
  const { data: summary } = useQuery({
    queryKey: ['summary', workspaceId, now.getFullYear(), now.getMonth() + 1],
    queryFn: () =>
      summaryApi.getMonthly(
        workspaceId!,
        now.getFullYear(),
        now.getMonth() + 1
      ),
    enabled: Boolean(workspaceId),
  });

  const { data: categories } = useCategories(workspaceId);
  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
  const { data: accounts } = useQuery({
    queryKey: ['accounts', workspaceId],
    queryFn: () => accountsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });
  const accountById = new Map((accounts ?? []).map((a) => [a.id, a]));
  const { data: cards } = useQuery({
    queryKey: ['cards', workspaceId],
    queryFn: () => cardsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });
  const cardById = new Map((cards ?? []).map((c) => [c.id, c]));

  const isoFrom = dateFrom ? formatIsoDate(dateFrom) : undefined;
  const isoTo = dateTo ? formatIsoDate(dateTo) : undefined;
  const hasAdvancedFilters = Boolean(
    accountFilter || cardFilter || isoFrom || isoTo
  );

  const { data: transactions, isLoading } = useQuery({
    queryKey: [
      'transactions',
      workspaceId,
      {
        q: debouncedSearch,
        categoryId: categoryFilter,
        accountId: accountFilter,
        cardId: cardFilter,
        from: isoFrom,
        to: isoTo,
      },
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
    mutationFn: (transactionId: string) =>
      transactionsApi.delete(workspaceId!, transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['transactions', workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ['summary', workspaceId] });
      setEditingTransaction(null);
    },
  });

  const handleDelete = (transaction: Transaction) => {
    Alert.alert(
      'Excluir transação',
      `Excluir "${transaction.description}"? Essa ação pode ser desfeita depois.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(transaction.id),
        },
      ]
    );
  };

  const categoryOptions = [
    { label: 'Todas as categorias', value: ALL_CATEGORIES_VALUE },
    ...buildCategoryOptions(categories),
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

  const { data: pending } = useQuery({
    queryKey: [
      'recurring-pending',
      workspaceId,
      now.getFullYear(),
      now.getMonth() + 1,
    ],
    queryFn: () =>
      recurringApi.listPending(
        workspaceId!,
        now.getFullYear(),
        now.getMonth() + 1
      ),
    enabled: Boolean(workspaceId),
  });

  return (
    <Screen className="gap-4 px-0 pb-0" scroll={false}>
      <View className="w-full flex-row items-start justify-between px-4">
        {activeWorkspace && (
          <HeaderChip onPress={() => router.push('/workspaces')}>
            <Text className="text-[10px] font-normal leading-tight text-foreground">
              {activeWorkspace.name}
            </Text>
            <CaretDownIcon size={16} color={theme.textSecondary} />
          </HeaderChip>
        )}
        <View className="flex-row items-center gap-4">
          <HeaderChip
            onPress={() => router.push('/formulas')}
            accessibilityLabel="Calculadora de fórmulas"
          >
            <CalculatorIcon size={16} color={theme.textSecondary} />
          </HeaderChip>
          {(featureFlags.card_invoice_csv_import === true ||
            featureFlags.account_csv_import === true) && (
            <HeaderChip
              onPress={() => setImportOpen(true)}
              accessibilityLabel="Importar CSV"
            >
              <UploadSimpleIcon size={16} color={theme.textSecondary} />
            </HeaderChip>
          )}
          <HeaderChip
            onPress={() => setRecurringManagerOpen(true)}
            accessibilityLabel="Recorrências"
          >
            <RepeatIcon size={16} color={theme.textSecondary} />
          </HeaderChip>
          <HeaderChip
            onPress={() => router.push('/transactions/trash')}
            accessibilityLabel="Transações arquivadas"
          >
            <TrashIcon size={16} color={theme.textSecondary} />
          </HeaderChip>
        </View>
      </View>

      <BalanceOverview summary={summary} />

      <PinnedFormulas
        workspaceId={workspaceId}
        pinnedField="pinnedTransactions"
      />

      <View className="w-full flex-row items-center gap-2 px-4">
        {searchOpen ? (
          <>
            <Input
              autoFocus
              className="flex-1"
              placeholder="Buscar por descrição"
              value={search}
              onChangeText={setSearch}
              leadingIcon={
                <MagnifyingGlassIcon size={18} color={theme.textSecondary} />
              }
            />
            <HeaderChip
              className="h-12 w-12 rounded-lg"
              onPress={() => {
                setSearchOpen(false);
                setSearch('');
              }}
              accessibilityLabel="Fechar busca"
            >
              <XIcon size={16} color={theme.textSecondary} />
            </HeaderChip>
          </>
        ) : (
          <>
            <HeaderChip
              className="h-12 w-12 rounded-lg"
              onPress={() => setSearchOpen(true)}
              accessibilityLabel="Buscar por descrição"
            >
              <MagnifyingGlassIcon size={16} color={theme.textSecondary} />
            </HeaderChip>
            <Select
              className="flex-1"
              placeholder="Todas as categorias"
              options={categoryOptions}
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              searchable
              searchPlaceholder="Buscar categoria..."
            />
            <HeaderChip
              className="h-12 w-12 rounded-lg"
              onPress={() => setFiltersOpen((prev) => !prev)}
              accessibilityLabel="Mais filtros"
            >
              {hasAdvancedFilters ? (
                <FunnelXIcon
                  size={16}
                  weight="fill"
                  color={BrandColors.primary}
                />
              ) : (
                <FunnelIcon size={16} color={theme.textSecondary} />
              )}
            </HeaderChip>
          </>
        )}
      </View>

      {filtersOpen && (
        <View className="w-full px-4">
          <View className="w-full gap-2.5 rounded bg-primary/5 p-2">
            <Text className="text-[10px] font-bold leading-tight text-foreground">
              Filtros
            </Text>
            <View className="w-full flex-row items-center justify-between">
              <Text className="text-[10px] font-medium leading-tight text-foreground">
                Período e conta/cartão
              </Text>
              {hasAdvancedFilters && (
                <Pressable
                  onPress={clearAdvancedFilters}
                  hitSlop={8}
                  className="flex-row items-center gap-1 active:opacity-60"
                >
                  <XIcon size={12} color={theme.textSecondary} />
                  <Text className="text-[10px] font-normal leading-tight text-muted-foreground">
                    Limpar
                  </Text>
                </Pressable>
              )}
            </View>

            <View className="w-full flex-row gap-2.5">
              <DatePicker
                className={cn('flex-1', CHIP_FIELD_CLASSNAME)}
                placeholder="De"
                value={dateFrom}
                onChange={setDateFrom}
                max={dateTo}
                formatDate={(d) => d.toLocaleDateString('pt-BR')}
              />
              <DatePicker
                className={cn('flex-1', CHIP_FIELD_CLASSNAME)}
                placeholder="Até"
                value={dateTo}
                onChange={setDateTo}
                min={dateFrom}
                formatDate={(d) => d.toLocaleDateString('pt-BR')}
              />
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
        </View>
      )}

      {pending && pending.length > 0 && (
        <View className="w-full px-4">
          <Accordion
            title={`Recorrências pendentes deste mês (${pending.length})`}
          >
            <View className="w-full -mx-4">
              {pending.map((occurrence) => (
                <PendingOccurrenceRow
                  key={`${occurrence.recurringId}-${occurrence.date}`}
                  occurrence={occurrence}
                  workspaceId={workspaceId!}
                />
              ))}
            </View>
          </Accordion>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : transactions && transactions.length > 0 ? (
        <FlatList
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransactionRow
              transaction={item}
              category={categoryById.get(item.categoryId)}
              sourceLabel={transactionSourceLabel(item, cardById, accountById)}
              onPress={() => setEditingTransaction(item)}
            />
          )}
        />
      ) : (
        <View className="mx-4 items-center gap-3 rounded-lg border border-foreground/10 py-10">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ReceiptIcon size={22} color={BrandColors.primary} />
          </View>
          <Text className="text-[10px] font-semibold leading-tight text-foreground">
            Nenhuma transação ainda
          </Text>
          <Text
            className="text-[10px] font-normal leading-tight text-muted-foreground"
            style={{ textAlign: 'center' }}
          >
            Lançamentos de contas e cartões deste workspace aparecem aqui.
          </Text>
        </View>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova transação</DialogTitle>
          </DialogHeader>
          <CreateTransactionForm onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Importar CSV</DialogTitle>
          </DialogHeader>
          {importOpen && (
            <ImportCsvForm
              cards={cards ?? []}
              accounts={accounts ?? []}
              categories={categories ?? []}
              cardCsvImportEnabled={
                featureFlags.card_invoice_csv_import === true
              }
              accountCsvImportEnabled={featureFlags.account_csv_import === true}
              onDone={() => setImportOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <RecurringManagerDialog
        open={recurringManagerOpen}
        onOpenChange={setRecurringManagerOpen}
      />

      <Dialog
        open={Boolean(editingTransaction)}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
      >
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
        className="absolute bottom-24 right-4 h-[42px] w-[42px] items-center justify-center rounded-lg bg-primary active:opacity-80"
      >
        <PlusIcon size={16} color="#FFFFFF" weight="bold" />
      </Pressable>
    </Screen>
  );
}
