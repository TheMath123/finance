import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { verifyEmailSchema, type VerifyEmailInput } from '@/lib/schemas/auth';

export function VerifyEmailForm() {
  const { control, handleSubmit } = useForm<VerifyEmailInput>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { token: '' },
  });

  const mutation = useMutation({
    mutationFn: authApi.verifyEmail,
  });

  if (mutation.isSuccess) {
    return (
      <View className="gap-4">
        <ThemedText type="small" themeColor="textSecondary">
          E-mail verificado. Você já pode fazer login normalmente.
        </ThemedText>

        <Link href="/login" className="pt-2 text-center">
          <ThemedText type="linkPrimary">Ir para o login</ThemedText>
        </Link>
      </View>
    );
  }

  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="token"
        label="Token"
        placeholder="Cole aqui o token recebido por e-mail"
        autoCapitalize="none"
      />

      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError ? mutation.error.message : 'Erro inesperado'}
        </ThemedText>
      )}

      <Button loading={mutation.isPending} onPress={handleSubmit((input) => mutation.mutate(input))}>
        Verificar e-mail
      </Button>

      <Link href="/login" className="pt-2 text-center">
        <ThemedText type="linkPrimary">Voltar para o login</ThemedText>
      </Link>
    </View>
  );
}
