import { evaluateFormula } from '@finance/formula';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { formulaApi } from '@/lib/formula-api';
import { buildClientFormulaCatalog } from '@/lib/formula-catalog';
import { formatCents } from '@/lib/money';
import { summaryApi } from '@/lib/summary-api';

/**
 * Fórmulas fixadas como widget na Home e/ou em Transações — mesmo conceito do
 * dashboard (pinnedHome/pinnedTransactions), primeira seção dinâmica dessas
 * telas no mobile. Some por completo se não houver nenhuma fixada nessa tela,
 * igual ao `+page.svelte` do dashboard.
 */
export function PinnedFormulas({
  workspaceId,
  pinnedField,
}: {
  workspaceId: string | null;
  pinnedField: 'pinnedHome' | 'pinnedTransactions';
}) {
  const now = new Date();

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

  const pinned = (formulas ?? []).filter((formula) => formula[pinnedField]);
  if (pinned.length === 0) return null;

  const { values } = summary
    ? buildClientFormulaCatalog(summary)
    : { values: {} };

  return (
    <View className="w-full gap-2 px-4">
      <ThemedText type="small" themeColor="textSecondary">
        Fórmulas salvas
      </ThemedText>
      {pinned.map((formula) => {
        const result = evaluateFormula(formula.expression, values);
        const displayValue = result.ok
          ? formula.displayFormat === 'currency'
            ? formatCents(Math.round(result.value * 100))
            : String(result.value)
          : '—';
        return (
          <Card
            key={formula.id}
            className="flex-row items-center justify-between"
          >
            <ThemedText type="smallBold">{formula.name}</ThemedText>
            <ThemedText type="smallBold">{displayValue}</ThemedText>
          </Card>
        );
      })}
    </View>
  );
}
