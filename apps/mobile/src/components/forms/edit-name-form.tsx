import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { type UpdateNameInput, updateNameSchema } from '@/lib/schemas/auth';

export interface EditNameFormProps {
  /** Chamado após salvar com sucesso — usado pelo modal do perfil pra se fechar sozinho. */
  onSuccess?: () => void;
}

/** Troca de nome: sem confirmação extra (spec do perfil) — salva e já atualiza a sessão. */
export function EditNameForm({ onSuccess }: EditNameFormProps = {}) {
  const { user, refreshUser } = useSession();
  const { control, handleSubmit, reset } = useForm<UpdateNameInput>({
    resolver: zodResolver(updateNameSchema),
    mode: 'onTouched',
    defaultValues: { name: user?.name ?? '' },
  });

  const mutation = useMutation({
    mutationFn: authApi.updateName,
    onSuccess: async (_data, variables) => {
      await refreshUser();
      reset({ name: variables.name });
      onSuccess?.();
    },
  });

  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="name"
        label="Nome"
        placeholder="Seu nome"
        autoCapitalize="words"
      />

      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : 'Erro inesperado'}
        </ThemedText>
      )}
      {mutation.isSuccess && (
        <ThemedText type="small" themeColor="textSecondary">
          Nome atualizado.
        </ThemedText>
      )}

      <Button
        loading={mutation.isPending}
        onPress={handleSubmit((input) => mutation.mutate(input))}
      >
        Salvar nome
      </Button>
    </View>
  );
}
