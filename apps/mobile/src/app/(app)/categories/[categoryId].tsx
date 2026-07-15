import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { CategoryForm } from '@/components/forms/category-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { categoriesApi } from '@/lib/categories-api';

export default function EditCategoryScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const { workspaceId } = useSession();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', workspaceId],
    queryFn: () => categoriesApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const category = categories?.find((c) => c.id === categoryId);

  // Categoria padrão não é editável — não deveria nem chegar aqui pela UI,
  // mas protege contra navegação direta/deep link.
  useEffect(() => {
    if (!isLoading && (!category || category.isDefault)) router.back();
  }, [isLoading, category]);

  return (
    <Screen className="gap-6">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Editar categoria</ThemedText>
      </View>
      {isLoading || !category ? (
        <ActivityIndicator />
      ) : (
        <CategoryForm category={category} onDone={() => router.back()} />
      )}
    </Screen>
  );
}
