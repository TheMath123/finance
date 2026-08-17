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
import { CategoryBadge } from '@/components/ui/category-badge';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { type Category, categoriesApi } from '@/lib/categories-api';
import { resolveCategoryIcon } from '@/lib/category-icons';

export default function CategoriesScreen() {
  const { workspaceId, featureFlags } = useSession();
  const canManageCategories = featureFlags.custom_category_creation === true;
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', workspaceId],
    queryFn: () => categoriesApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const deleteCategory = useMutation({
    mutationFn: (categoryId: string) =>
      categoriesApi.delete(workspaceId!, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', workspaceId] });
    },
    onError: (error) => {
      Alert.alert(
        'Não foi possível excluir',
        error instanceof ApiError ? error.message : 'Erro inesperado'
      );
    },
  });

  const confirmDeleteCategory = (category: Category) => {
    Alert.alert('Excluir categoria', `Deseja excluir "${category.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => deleteCategory.mutate(category.id),
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
            <ArrowLeftIcon size={22} />
          </Pressable>
          <ThemedText type="subtitle">Categorias</ThemedText>
        </View>
        {canManageCategories && (
          <Pressable
            onPress={() => router.push('/categories/new')}
            className="h-9 w-9 items-center justify-center rounded-full bg-primary/10 active:opacity-70"
          >
            <PlusIcon size={18} color="#2563EB" weight="bold" />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator />
      ) : categories && categories.length > 0 ? (
        categories.map((category) =>
          category.isDefault || !canManageCategories ? (
            <Card
              key={category.id}
              className="flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3">
                <CategoryBadge
                  color={category.color}
                  icon={resolveCategoryIcon(category.icon)}
                  size={32}
                />
                <ThemedText type="smallBold">{category.name}</ThemedText>
              </View>
              {category.isDefault && (
                <ThemedText type="small" themeColor="textSecondary">
                  Padrão
                </ThemedText>
              )}
            </Card>
          ) : (
            <Card
              key={category.id}
              className="flex-row items-center justify-between"
            >
              <Pressable
                className="flex-1 flex-row items-center gap-3"
                onPress={() => router.push(`/categories/${category.id}`)}
              >
                <CategoryBadge
                  color={category.color}
                  icon={resolveCategoryIcon(category.icon)}
                  size={32}
                />
                <ThemedText type="smallBold">{category.name}</ThemedText>
              </Pressable>
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => router.push(`/categories/${category.id}`)}
                  className="h-8 w-8 items-center justify-center rounded-full bg-primary/10 active:opacity-70"
                >
                  <PencilIcon size={16} color="#2563EB" />
                </Pressable>
                <Pressable
                  onPress={() => confirmDeleteCategory(category)}
                  className="h-8 w-8 items-center justify-center rounded-full bg-destructive/10 active:opacity-70"
                >
                  <TrashIcon size={16} color="#DC2626" />
                </Pressable>
              </View>
            </Card>
          )
        )
      ) : (
        <Card className="items-center py-6">
          <ThemedText type="small" themeColor="textSecondary">
            Nenhuma categoria cadastrada ainda.
          </ThemedText>
        </Card>
      )}
    </Screen>
  );
}
