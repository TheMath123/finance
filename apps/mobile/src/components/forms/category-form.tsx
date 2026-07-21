import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { SelectField } from '@/components/form/select-field';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { categoriesApi, type Category } from '@/lib/categories-api';
import { categorySchema, type CategoryInput } from '@/lib/schemas/finance';

const COLOR_OPTIONS = [
  { label: 'Verde', value: '#22C55E' },
  { label: 'Azul', value: '#3B82F6' },
  { label: 'Vermelho', value: '#EF4444' },
  { label: 'Laranja', value: '#F59E0B' },
  { label: 'Roxo', value: '#8B5CF6' },
  { label: 'Rosa', value: '#EC4899' },
  { label: 'Ciano', value: '#06B6D4' },
  { label: 'Cinza', value: '#6B7280' },
];

export function CategoryForm({ category, onDone }: { category?: Category; onDone: () => void }) {
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
      <TextField control={control} name="name" label="Nome" placeholder="Ex.: Mercado" />
      <TextField control={control} name="icon" label="Ícone" placeholder="Ex.: shopping-cart" />
      <SelectField
        control={control}
        name="color"
        label="Cor"
        placeholder="Selecione a cor"
        options={COLOR_OPTIONS}
      />
      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError ? mutation.error.message : 'Erro inesperado'}
        </ThemedText>
      )}
      <Button loading={mutation.isPending} onPress={handleSubmit((input) => mutation.mutate(input))}>
        {category ? 'Salvar alterações' : 'Adicionar categoria'}
      </Button>
    </View>
  );
}
