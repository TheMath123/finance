import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { FormulaForm } from '@/components/forms/formula-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { formulaApi } from '@/lib/formula-api';

export default function EditFormulaScreen() {
  const { formulaId } = useLocalSearchParams<{ formulaId: string }>();
  const { workspaceId } = useSession();

  const { data: formulas, isLoading } = useQuery({
    queryKey: ['saved-formulas', workspaceId],
    queryFn: () => formulaApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const formula = formulas?.find((f) => f.id === formulaId);

  // Protege contra navegação direta/deep link pra uma fórmula que já foi excluída.
  useEffect(() => {
    if (!isLoading && !formula) router.back();
  }, [isLoading, formula]);

  return (
    <Screen className="gap-6">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="active:opacity-60"
        >
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Editar fórmula</ThemedText>
      </View>
      {isLoading || !formula ? (
        <ActivityIndicator />
      ) : (
        <FormulaForm formula={formula} onDone={() => router.back()} />
      )}
    </Screen>
  );
}
