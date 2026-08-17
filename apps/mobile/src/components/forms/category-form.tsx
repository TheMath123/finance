import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { ColorField } from '@/components/form/color-field';
import { IconField } from '@/components/form/icon-field';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { type Category, categoriesApi } from '@/lib/categories-api';
import { type CategoryInput, categorySchema } from '@/lib/schemas/finance';

export function CategoryForm({
  category,
  onDone,
}: {
  category?: Category;
  onDone: () => void;
}) {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const { control, handleSubmit } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    mode: 'onTouched',
    defaultValues: {
      name: category?.name ?? '',
      icon: category?.icon ?? '',
      color: category?.color ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (input: CategoryInput) =>
      category
        ? categoriesApi.update(workspaceId!, category.id, input)
        : categoriesApi.create(workspaceId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', workspaceId] });
      onDone();
    },
  });

  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="name"
        label="Nome"
        placeholder="Ex.: Mercado"
      />
      <IconField
        control={control}
        name="icon"
        label="Ícone"
        placeholder="Selecione um ícone"
      />
      <ColorField
        control={control}
        name="color"
        label="Cor"
        placeholder="Selecione a cor"
      />
      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : 'Erro inesperado'}
        </ThemedText>
      )}
      <Button
        loading={mutation.isPending}
        onPress={handleSubmit((input) => mutation.mutate(input))}
      >
        {category ? 'Salvar alterações' : 'Adicionar categoria'}
      </Button>
    </View>
  );
}
