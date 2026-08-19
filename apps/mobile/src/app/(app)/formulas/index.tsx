import { evaluateFormula } from '@finance/formula';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ArrowLeftIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from 'phosphor-react-native';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { BrandColors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useTheme } from '@/hooks/use-theme';
import { accountsApi } from '@/lib/accounts-api';
import { ApiError } from '@/lib/api-client';
import { cardsApi } from '@/lib/cards-api';
import { formulaApi, type SavedFormula } from '@/lib/formula-api';
import { buildClientFormulaCatalog } from '@/lib/formula-catalog';
import { formatCents } from '@/lib/money';
import { summaryApi } from '@/lib/summary-api';

function FormulaRow({
  formula,
  values,
  onDelete,
}: {
  formula: SavedFormula;
  values: Record<string, number>;
  onDelete: () => void;
}) {
  const result = evaluateFormula(formula.expression, values);
  const displayValue = result.ok
    ? formula.displayFormat === 'currency'
      ? formatCents(Math.round(result.value * 100))
      : String(result.value)
    : '—';

  const pinLabels = [
    formula.pinnedHome && 'Início',
    formula.pinnedTransactions && 'Transações',
  ].filter(Boolean) as string[];

  return (
    <Card className="gap-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <ThemedText type="smallBold" numberOfLines={1}>
            {formula.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {displayValue}
          </ThemedText>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => router.push(`/formulas/${formula.id}`)}
            className="h-8 w-8 items-center justify-center rounded-full bg-primary/10 active:opacity-70"
          >
            <PencilIcon size={16} color={BrandColors.primary} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            className="h-8 w-8 items-center justify-center rounded-full bg-destructive/10 active:opacity-70"
          >
            <TrashIcon size={16} color="#DC2626" />
          </Pressable>
        </View>
      </View>
      {pinLabels.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Fixada em {pinLabels.join(' e ')}
        </ThemedText>
      )}
    </Card>
  );
}

export default function FormulasScreen() {
  const theme = useTheme();
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const now = new Date();

  const { data: formulas, isLoading } = useQuery({
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
  const { values } = summary
    ? buildClientFormulaCatalog(summary, accounts, cards)
    : { values: {} };

  const deleteMutation = useMutation({
    mutationFn: (formulaId: string) =>
      formulaApi.delete(workspaceId!, formulaId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['saved-formulas', workspaceId],
      });
    },
    onError: (error) => {
      Alert.alert(
        'Não foi possível excluir',
        error instanceof ApiError ? error.message : 'Erro inesperado'
      );
    },
  });

  const confirmDelete = (formula: SavedFormula) => {
    Alert.alert('Excluir fórmula', `Deseja excluir "${formula.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(formula.id),
      },
    ]);
  };

  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="active:opacity-60"
          >
            <ArrowLeftIcon size={22} color={theme.text} />
          </Pressable>
          <ThemedText type="subtitle">Calculadora</ThemedText>
        </View>
        <Pressable
          onPress={() => router.push('/formulas/new')}
          className="h-9 w-9 items-center justify-center rounded-full bg-primary/10 active:opacity-70"
        >
          <PlusIcon size={18} color={BrandColors.primary} weight="bold" />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator />
      ) : formulas && formulas.length > 0 ? (
        formulas.map((formula) => (
          <FormulaRow
            key={formula.id}
            formula={formula}
            values={values}
            onDelete={() => confirmDelete(formula)}
          />
        ))
      ) : (
        <Card className="items-center py-6">
          <ThemedText type="small" themeColor="textSecondary">
            Nenhuma fórmula criada ainda.
          </ThemedText>
        </Card>
      )}
    </Screen>
  );
}
