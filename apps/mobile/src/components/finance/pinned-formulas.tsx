import { evaluateFormula } from '@finance/formula';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { ThemedText } from '@/components/themed-text';
import { Accordion } from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { accountsApi } from '@/lib/accounts-api';
import { cardsApi } from '@/lib/cards-api';
import { formulaApi, type SavedFormula } from '@/lib/formula-api';
import { buildClientFormulaCatalog } from '@/lib/formula-catalog';
import { formatCents } from '@/lib/money';
import { summaryApi } from '@/lib/summary-api';

/**
 * Fórmulas fixadas como widget na Home e/ou em Transações — mesmo conceito do
 * dashboard (pinnedHome/pinnedTransactions), primeira seção dinâmica dessas
 * telas no mobile. Some por completo se não houver nenhuma fixada nessa tela,
 * igual ao `+page.svelte` do dashboard. Arrastável (toque longo) via
 * react-native-draggable-flatlist — reordena de verdade via `formulaApi.reorder`.
 */
export function PinnedFormulas({
  workspaceId,
  pinnedField,
}: {
  workspaceId: string | null;
  pinnedField: 'pinnedHome' | 'pinnedTransactions';
}) {
  const queryClient = useQueryClient();
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
   * verdade (ex.: depois do `invalidateQueries` no fim do reorder).
   */
  const [items, setItems] = useState<SavedFormula[]>(pinned);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ressincroniza só quando a query em si mudar, não a cada render (pinned é recriado sempre).
  useEffect(() => {
    setItems(pinned);
  }, [formulas]);

  const reorderMutation = useMutation({
    mutationFn: (formulaIds: string[]) =>
      formulaApi.reorder(workspaceId!, reorderField, formulaIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['saved-formulas', workspaceId],
      });
    },
  });

  if (pinned.length === 0) return null;

  const { values } = summary
    ? buildClientFormulaCatalog(summary, accounts, cards)
    : { values: {} };

  return (
    <View className="w-full px-4">
      <Accordion title="Fórmulas salvas">
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
              <Pressable
                onLongPress={drag}
                disabled={isActive}
                className="mb-2"
              >
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
      </Accordion>
    </View>
  );
}
