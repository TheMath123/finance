import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { type VerifyEmailInput, verifyEmailSchema } from '@/lib/schemas/auth';

export function VerifyEmailForm() {
  const { refreshUser } = useSession();
  const { control, handleSubmit } = useForm<VerifyEmailInput>({
    resolver: zodResolver(verifyEmailSchema),
    mode: 'onTouched',
    defaultValues: { token: '' },
  });

  const mutation = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: () => refreshUser(),
  });

  if (mutation.isSuccess) {
    return (
      <View className="gap-4">
        <ThemedText type="small" themeColor="textSecondary">
          E-mail verificado com sucesso.
        </ThemedText>

        <Button onPress={() => router.back()}>Voltar</Button>
      </View>
    );
  }

  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="token"
        label="Código"
        placeholder="Cole aqui o código recebido por e-mail"
        autoCapitalize="none"
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
        Verificar e-mail
      </Button>
    </View>
  );
}
