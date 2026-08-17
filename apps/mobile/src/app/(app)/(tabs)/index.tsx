import { useQueries, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CaretDownIcon, CaretRightIcon } from 'phosphor-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { BalanceOverview } from '@/components/finance/balance-overview';
import { HeaderChip } from '@/components/finance/header-chip';
import { PinnedFormulas } from '@/components/finance/pinned-formulas';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useSession } from '@/context/session';
import { useTheme } from '@/hooks/use-theme';
import { cardsApi } from '@/lib/cards-api';
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

/** Mês seguinte ao informado (rolando o ano quando dezembro → janeiro). */
function nextMonth(
  year: number,
  month: number
): { year: number; month: number } {
  return month === 12
    ? { year: year + 1, month: 1 }
    : { year, month: month + 1 };
}

/** Linha com divisor no topo (label + valor + descrição opcional) — mesmo padrão flat dos blocos da Home no Figma, sem Card/borda ao redor. Navegável quando `onPress` é passado (ex.: Gasto variável abre o detalhamento por categoria). */
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

export default function HomeScreen() {
  const { workspaceId } = useSession();
  const theme = useTheme();
  const now = new Date();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['summary', workspaceId, now.getFullYear(), now.getMonth() + 1],
    queryFn: () =>
      summaryApi.getMonthly(
        workspaceId!,
        now.getFullYear(),
        now.getMonth() + 1
      ),
    enabled: Boolean(workspaceId),
  });

  // Mesma fórmula do mês corrente (saldo + recorrências previstas − faturas em
  // aberto − estimativa de gasto variável), só que aplicada ao mês seguinte —
  // o backend (monthlySummary) já suporta isso, só pedindo o mês certo.
  const { year: nextYear, month: nextMonthNumber } = nextMonth(
    now.getFullYear(),
    now.getMonth() + 1
  );
  const { data: nextSummary } = useQuery({
    queryKey: ['summary', workspaceId, nextYear, nextMonthNumber],
    queryFn: () =>
      summaryApi.getMonthly(workspaceId!, nextYear, nextMonthNumber),
    enabled: Boolean(workspaceId),
  });

  const nextInvoice = useNextInvoice(workspaceId);
  const recurringPending = useRecurringPendingTotal(workspaceId);

  const { data: variableExpense } = useQuery({
    queryKey: ['variable-expense-estimate', workspaceId],
    queryFn: () => summaryApi.getVariableExpenseEstimate(workspaceId!),
    enabled: Boolean(workspaceId),
  });
  const variableExpenseTopCategory = [
    ...(variableExpense?.byCategory ?? []),
  ].sort((a, b) => b.estimated - a.estimated)[0];

  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceApi.listMine,
  });
  const activeWorkspace = workspaces?.find((w) => w.id === workspaceId);

  return (
    <Screen className="gap-4 px-0 pb-28">
      <View className="px-4">
        {activeWorkspace && (
          <HeaderChip
            onPress={() => router.push('/workspaces')}
            className="self-start"
          >
            <Text className="text-[10px] font-normal leading-tight text-foreground">
              {activeWorkspace.name}
            </Text>
            <CaretDownIcon size={16} color={theme.textSecondary} />
          </HeaderChip>
        )}
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

      <SummaryListRow
        label="Gasto variável estimado"
        value={formatCents(variableExpense?.total ?? 0)}
        description={
          variableExpenseTopCategory
            ? `Maior categoria: ${variableExpenseTopCategory.name} (${formatCents(variableExpenseTopCategory.estimated)})`
            : 'Média dos últimos 3 meses por categoria.'
        }
        onPress={() => router.push('/variable-expense')}
      />

      <PinnedFormulas workspaceId={workspaceId} pinnedField="pinnedHome" />
    </Screen>
  );
}
