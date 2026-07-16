import { useQueries, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CaretDownIcon, TrendUpIcon, TrendDownIcon } from 'phosphor-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { cardsApi } from '@/lib/cards-api';
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
    if (!card || !query.data) return;
    for (const invoice of query.data) {
      if (invoice.effectiveStatus === 'paid') continue;
      const dueDate = new Date(invoice.yearReference, invoice.monthReference - 1, card.dueDay);
      if (!best || dueDate < best.dueDate) {
        best = { cardName: card.name, total: invoice.total, dueDate };
      }
    }
  });
  return best;
}

export default function HomeScreen() {
  const { workspaceId } = useSession();
  const now = new Date();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['summary', workspaceId, now.getFullYear(), now.getMonth() + 1],
    queryFn: () => summaryApi.getMonthly(workspaceId!, now.getFullYear(), now.getMonth() + 1),
    enabled: Boolean(workspaceId),
  });

  const nextInvoice = useNextInvoice(workspaceId);

  const { data: workspaces } = useQuery({ queryKey: ['workspaces'], queryFn: workspaceApi.listMine });
  const activeWorkspace = workspaces?.find((w) => w.id === workspaceId);

  return (
    <Screen className="gap-6 pb-28">
      {activeWorkspace && (
        <Pressable
          onPress={() => router.push('/workspaces')}
          className="flex-row items-center gap-1.5 self-start active:opacity-70">
          <ThemedText type="smallBold">{activeWorkspace.name}</ThemedText>
          <CaretDownIcon size={14} color="#71717a" />
        </Pressable>
      )}

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
        {nextInvoice ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Próxima fatura — {nextInvoice.cardName}
            </ThemedText>
            <ThemedText type="subtitle">{formatCents(nextInvoice.total)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Vence em {nextInvoice.dueDate.toLocaleDateString('pt-BR')}
            </ThemedText>
          </>
        ) : (
          <>
            <ThemedText type="smallBold">Nenhuma fatura este mês</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              Suas próximas faturas de cartão aparecem aqui.
            </ThemedText>
          </>
        )}
      </Card>
    </Screen>
  );
}
