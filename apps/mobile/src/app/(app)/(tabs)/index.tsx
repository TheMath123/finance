import { useQueries, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { BalanceOverview } from '@/components/finance/balance-overview';
import { HeaderChip } from '@/components/finance/header-chip';
import { PinnedFormulas } from '@/components/finance/pinned-formulas';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useSession } from '@/context/session';
import { useTheme } from '@/hooks/use-theme';
import { cardsApi } from '@/lib/cards-api';
import { cn } from '@/lib/cn';
import { useRecurringPendingTotal } from '@/lib/hooks/use-recurring-pending-total';
import { formatCents } from '@/lib/money';
import { summaryApi } from '@/lib/summary-api';
import { workspaceApi } from '@/lib/workspace-api';

interface NextInvoice {
  cardName: string;
  total: number;
  dueDate: Date;
}

/** Próxima fatura em aberto (menor data de vencimento entre todos os cartões), pro card do Resumo. */
function useNextInvoice(workspaceId: string | null): NextInvoice | null {
  const { data: cards } = useQuery({
    queryKey: ['cards', workspaceId],
    queryFn: () => cardsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const invoiceQueries = useQueries({
    queries: (cards ?? []).map((card) => ({
      queryKey: ['invoices', card.id],
      queryFn: () => cardsApi.listInvoices(workspaceId!, card.id),
      enabled: Boolean(workspaceId),
    })),
  });

  if (!cards) return null;

  let best: NextInvoice | null = null;
  invoiceQueries.forEach((query, index) => {
    const card = cards[index];
    if (!card || !Array.isArray(query.data)) return;
    for (let i = 0; i < query.data.length; i++) {
      const invoice = query.data[i];
      if (invoice.effectiveStatus === 'paid') continue;
      const dueDate = new Date(
        invoice.yearReference,
        invoice.monthReference - 1,
        card.dueDay
      );
      if (!best || dueDate < best.dueDate) {
        best = { cardName: card.name, total: invoice.total, dueDate };
      }
    }
  });
  return best;
}

interface MonthCursor {
  year: number;
  month: number;
}

/** Mês seguinte ao informado (rolando o ano quando dezembro → janeiro). */
function nextMonth({ year, month }: MonthCursor): MonthCursor {
  return month === 12
    ? { year: year + 1, month: 1 }
    : { year, month: month + 1 };
}

/** Mês anterior ao informado (rolando o ano quando janeiro → dezembro). */
function prevMonth({ year, month }: MonthCursor): MonthCursor {
  return month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 };
}

function currentMonthCursor(): MonthCursor {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Linha com divisor no topo (label + valor + descrição opcional) — mesmo padrão flat dos blocos da Home no Figma, sem Card/borda ao redor. Navegável quando `onPress` é passado. */
function SummaryListRow({
  label,
  value,
  description,
  onPress,
}: {
  label: string;
  value: React.ReactNode;
  description?: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const Container = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      className="w-full flex-row items-start justify-center border-t border-foreground/10 px-4 pt-4 active:opacity-70"
    >
      <View className="flex-1 gap-2.5">
        <Text className="text-[10px] font-normal leading-tight text-foreground">
          {label}
        </Text>
        <Text className="text-[20px] font-medium leading-tight text-foreground">
          {value}
        </Text>
        {description && (
          <Text className="text-[10px] font-normal leading-tight text-muted-foreground">
            {description}
          </Text>
        )}
      </View>
      <CaretRightIcon size={14} weight="bold" color={theme.textSecondary} />
    </Container>
  );
}

interface CategoryRow {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
}

/** Linha da tabela "Despesas por categoria" — bolinha colorida + nome + valor + barra proporcional, mesma ideia da tabela do dashboard, só que empilhada (nome/valor em cima, barra embaixo) por causa da largura estreita da tela. */
function CategoryBarRow({
  row,
  maxAmount,
  totalAmount,
}: {
  row: CategoryRow;
  maxAmount: number;
  totalAmount: number;
}) {
  const widthPct = Math.max(2, (row.amount / maxAmount) * 100);
  const sharePct = Math.round((row.amount / totalAmount) * 100);
  return (
    <View className="w-full gap-1.5 border-t border-foreground/10 px-4 py-2.5">
      <View className="flex-row items-center gap-2">
        <View
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: row.color }}
        />
        <Text
          className="flex-1 text-[12px] font-normal leading-tight text-foreground"
          numberOfLines={1}
        >
          {row.name}
        </Text>
        <Text className="text-[12px] font-medium leading-tight text-foreground">
          {formatCents(row.amount)}
        </Text>
        <Text className="w-8 text-right text-[10px] leading-tight text-muted-foreground">
          {sharePct}%
        </Text>
      </View>
      <View className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/5">
        <View
          className="h-1.5 rounded-full"
          style={{ width: `${widthPct}%`, backgroundColor: row.color }}
        />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { workspaceId } = useSession();
  const theme = useTheme();

  // Mesmo filtro de mês da Home do dashboard (setas prev/next) — recalcula
  // saldo, receitas, despesas e a aba "Este mês" de Despesas por categoria
  // pro mês selecionado, não só o mês corrente.
  const [cursor, setCursor] = useState<MonthCursor>(currentMonthCursor);
  const monthLabel = new Date(
    cursor.year,
    cursor.month - 1,
    1
  ).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const { data: summary, isLoading } = useQuery({
    queryKey: ['summary', workspaceId, cursor.year, cursor.month],
    queryFn: () =>
      summaryApi.getMonthly(workspaceId!, cursor.year, cursor.month),
    enabled: Boolean(workspaceId),
  });

  // Mesma fórmula do mês selecionado (saldo + recorrências previstas − faturas
  // em aberto − estimativa de gasto variável), só que aplicada ao mês
  // seguinte — o backend (monthlySummary) já suporta isso, só pedindo o mês certo.
  const { year: nextYear, month: nextMonthNumber } = nextMonth(cursor);
  const { data: nextSummary } = useQuery({
    queryKey: ['summary', workspaceId, nextYear, nextMonthNumber],
    queryFn: () =>
      summaryApi.getMonthly(workspaceId!, nextYear, nextMonthNumber),
    enabled: Boolean(workspaceId),
  });

  const nextInvoice = useNextInvoice(workspaceId);
  const recurringPending = useRecurringPendingTotal(workspaceId, cursor);

  const { data: variableExpense } = useQuery({
    queryKey: ['variable-expense-estimate', workspaceId],
    queryFn: () => summaryApi.getVariableExpenseEstimate(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceApi.listMine,
  });
  const activeWorkspace = workspaces?.find((w) => w.id === workspaceId);

  // "Despesas por categoria" — mesma seção do dashboard, com o mesmo toggle
  // (gasto real do mês selecionado vs. média/estimativa dos últimos 3 meses).
  const [categoryView, setCategoryView] = useState<'actual' | 'estimate'>(
    'actual'
  );
  const actualRows: CategoryRow[] = (summary?.byCategory ?? []).map((c) => ({
    categoryId: c.categoryId,
    name: c.name,
    color: c.color,
    amount: c.total,
  }));
  const estimateRows: CategoryRow[] = [...(variableExpense?.byCategory ?? [])]
    .sort((a, b) => b.estimated - a.estimated)
    .map((c) => ({
      categoryId: c.categoryId,
      name: c.name,
      color: c.color,
      amount: c.estimated,
    }));
  const categoryRows = categoryView === 'actual' ? actualRows : estimateRows;
  const maxCategoryAmount = Math.max(1, ...categoryRows.map((c) => c.amount));
  const categoryRowsTotal =
    categoryRows.reduce((sum, c) => sum + c.amount, 0) || 1;

  return (
    <Screen className="gap-4 px-0 pb-28">
      <View className="w-full flex-row items-center justify-between px-4">
        {activeWorkspace ? (
          <HeaderChip onPress={() => router.push('/workspaces')}>
            <Text className="text-[10px] font-normal leading-tight text-foreground">
              {activeWorkspace.name}
            </Text>
            <CaretDownIcon size={16} color={theme.textSecondary} />
          </HeaderChip>
        ) : (
          <View />
        )}

        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={() => setCursor((c) => prevMonth(c))}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            className="h-8 w-8 items-center justify-center rounded-lg active:bg-accent/30"
          >
            <CaretLeftIcon size={16} color={theme.textSecondary} />
          </Pressable>
          <Text className="min-w-24 text-center text-[12px] font-medium capitalize leading-tight text-foreground">
            {monthLabel}
          </Text>
          <Pressable
            onPress={() => setCursor((c) => nextMonth(c))}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Próximo mês"
            className="h-8 w-8 items-center justify-center rounded-lg active:bg-accent/30"
          >
            <CaretRightIcon size={16} color={theme.textSecondary} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator className="ml-4 self-start" />
      ) : (
        <BalanceOverview summary={summary} />
      )}

      {nextInvoice ? (
        <SummaryListRow
          label={`Próxima fatura - ${nextInvoice.cardName}`}
          value={formatCents(nextInvoice.total)}
          description={`Vence em ${nextInvoice.dueDate.toLocaleDateString('pt-BR')}`}
        />
      ) : (
        <SummaryListRow
          label="Nenhuma fatura este mês"
          value="—"
          description="Suas próximas faturas de cartão aparecem aqui."
        />
      )}

      <SummaryListRow
        label="Recorrências deste mês"
        value={
          recurringPending && recurringPending.count > 0
            ? formatCents(recurringPending.income - recurringPending.expense)
            : formatCents(0)
        }
        description={
          recurringPending && recurringPending.count > 0
            ? `${formatCents(recurringPending.income)} a receber, ${formatCents(recurringPending.expense)} a pagar`
            : 'Nenhuma recorrência pendente este mês.'
        }
      />

      <SummaryListRow
        label={`Projeção para ${new Date(nextYear, nextMonthNumber - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}`}
        value={
          nextSummary?.projectedAvailable != null
            ? formatCents(nextSummary.projectedAvailable)
            : '—'
        }
        description="Saldo atual + recorrências previstas − faturas em aberto − estimativa de gasto variável."
      />

      <View className="w-full gap-2 border-t border-foreground/10 px-4 pt-4">
        <View className="w-full flex-row items-center justify-between gap-2">
          <Text className="text-[10px] font-semibold leading-tight text-foreground">
            Despesas por categoria
          </Text>
          <View className="flex-row rounded-lg border border-foreground/10 p-0.5">
            <Pressable
              onPress={() => setCategoryView('actual')}
              className={cn(
                'rounded-md px-2.5 py-1',
                categoryView === 'actual' && 'bg-primary'
              )}
            >
              <Text
                className={cn(
                  'text-[10px] font-medium leading-tight',
                  categoryView === 'actual'
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground'
                )}
              >
                Este mês
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setCategoryView('estimate')}
              className={cn(
                'rounded-md px-2.5 py-1',
                categoryView === 'estimate' && 'bg-primary'
              )}
            >
              <Text
                className={cn(
                  'text-[10px] font-medium leading-tight',
                  categoryView === 'estimate'
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground'
                )}
              >
                Média (3m)
              </Text>
            </Pressable>
          </View>
        </View>

        {categoryRows.length > 0 ? (
          <View className="w-full -mx-4">
            {categoryRows.map((row) => (
              <CategoryBarRow
                key={row.categoryId}
                row={row}
                maxAmount={maxCategoryAmount}
                totalAmount={categoryRowsTotal}
              />
            ))}
          </View>
        ) : (
          <Text className="py-3 text-[10px] leading-tight text-muted-foreground">
            {categoryView === 'actual'
              ? 'Nenhuma despesa neste mês.'
              : 'Sem histórico suficiente ainda — a estimativa aparece depois de alguns meses de uso.'}
          </Text>
        )}
      </View>

      <PinnedFormulas workspaceId={workspaceId} pinnedField="pinnedHome" />
    </Screen>
  );
}
