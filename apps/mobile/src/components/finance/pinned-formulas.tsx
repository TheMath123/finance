import { evaluateFormula } from '@finance/formula';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CalculatorIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { ThemedText } from '@/components/themed-text';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { accountsApi } from '@/lib/accounts-api';
import { cardsApi } from '@/lib/cards-api';
import { formulaApi, type SavedFormula } from '@/lib/formula-api';
import { buildClientFormulaCatalog } from '@/lib/formula-catalog';
import { formatCents } from '@/lib/money';
import { summaryApi } from '@/lib/summary-api';

/**
 * Fórmulas fixadas como widget na Home e/ou em Transações — mesmo conceito do
 * dashboard (pinnedHome/pinnedTransactions). Cada tela replica a apresentação
 * da equivalente no dashboard, que NÃO é a mesma nas duas:
 * - Home (`+page.svelte`): sempre visível, com cabeçalho "Fórmulas salvas" +
 *   botão "Nova fórmula", e mostra um texto de vazio quando não há nada
 *   fixado — é uma seção de primeira classe da tela.
 * - Transações (`transactions/+page.svelte`): sem cabeçalho, sem botão, some
 *   por completo quando vazia — um widget secundário, discreto.
 * Arrastável (toque longo) via react-native-draggable-flatlist nos dois casos
 * — reordena de verdade via `formulaApi.reorder`.
 */
export function PinnedFormulas({
  workspaceId,
  pinnedField,
}: {
  workspaceId: string | null;
  pinnedField: 'pinnedHome' | 'pinnedTransactions';
}) {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isHome = pinnedField === 'pinnedHome';
  const now = new Date();
  const orderField =
    pinnedField === 'pinnedHome' ? 'homeOrder' : 'transactionsOrder';
  const reorderField = pinnedField === 'pinnedHome' ? 'home' : 'transactions';

  const { data: formulas } = useQuery({
    queryKey: ['saved-formulas', workspaceId],
    queryFn: () => formulaApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });
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

  const pinned = (formulas ?? [])
    .filter((formula) => formula[pinnedField])
    .sort((a, b) => (a[orderField] ?? Infinity) - (b[orderField] ?? Infinity));

  /**
   * Espelho local da ordem — o `DraggableFlatList` precisa controlar a lista
   * durante o arraste; ressincroniza quando os dados do servidor mudarem de
   * verdade (ex.: depois do `invalidateQueries` no fim do reorder). setState
   * durante o render (não num useEffect) é o padrão recomendado pra "resetar
   * estado quando uma prop muda" sem disparar uma renderização extra —
   * https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
   */
  const [items, setItems] = useState<SavedFormula[]>(pinned);
  const [syncedFormulas, setSyncedFormulas] = useState(formulas);
  if (formulas !== syncedFormulas) {
    setSyncedFormulas(formulas);
    setItems(pinned);
  }

  const reorderMutation = useMutation({
    mutationFn: (formulaIds: string[]) =>
      formulaApi.reorder(workspaceId!, reorderField, formulaIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['saved-formulas', workspaceId],
      });
    },
  });

  // Fora da Home, mantém o widget discreto: some por completo sem nada
  // fixado (igual à Transações do dashboard).
  if (!isHome && pinned.length === 0) return null;

  const { values } = summary
    ? buildClientFormulaCatalog(summary, accounts, cards)
    : { values: {} };

  const list = (
    <DraggableFlatList
      data={items}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      onDragEnd={({ data }) => {
        setItems(data);
        reorderMutation.mutate(data.map((f) => f.id));
      }}
      renderItem={({
        item,
        drag,
        isActive,
      }: RenderItemParams<SavedFormula>) => {
        const result = evaluateFormula(item.expression, values);
        const displayValue = result.ok
          ? item.displayFormat === 'currency'
            ? formatCents(Math.round(result.value * 100))
            : String(result.value)
          : '—';
        return (
          <Pressable onLongPress={drag} disabled={isActive} className="mb-2">
            <Card
              className={
                isActive
                  ? 'flex-row items-center justify-between opacity-70'
                  : 'flex-row items-center justify-between'
              }
            >
              <ThemedText type="smallBold">{item.name}</ThemedText>
              <ThemedText type="smallBold">{displayValue}</ThemedText>
            </Card>
          </Pressable>
        );
      }}
    />
  );

  if (!isHome) {
    return (
      <View className="w-full px-4">
        <Accordion title="Fórmulas salvas">{list}</Accordion>
      </View>
    );
  }

  // Home: seção de primeira classe, sempre visível — mesmo tratamento do
  // dashboard (cabeçalho + botão "Nova fórmula" + texto de vazio), nunca
  // escondida atrás de um accordion.
  return (
    <View className="w-full gap-3 px-4">
      <View className="w-full flex-row items-center justify-between">
        <Text className="text-[10px] font-semibold leading-tight text-foreground">
          Fórmulas salvas
        </Text>
        <Button
          variant="outline"
          size="sm"
          icon={<CalculatorIcon size={16} color={theme.text} />}
          onPress={() => router.push('/formulas/new')}
        >
          Nova fórmula
        </Button>
      </View>
      {pinned.length === 0 ? (
        <Text className="text-[10px] leading-tight text-muted-foreground">
          Nenhuma fórmula fixada aqui ainda.
        </Text>
      ) : (
        list
      )}
    </View>
  );
}
