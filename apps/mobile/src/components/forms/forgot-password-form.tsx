import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/schemas/auth';

export function ForgotPasswordForm() {
  const router = useRouter();
  const { control, handleSubmit } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: (_data, variables) => {
      router.push({ pathname: '/reset-password', params: { email: variables.email } });
    },
  });

  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="email"
        label="E-mail"
        placeholder="voce@exemplo.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />

      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError ? mutation.error.message : 'Erro inesperado'}
        </ThemedText>
      )}

      <Button loading={mutation.isPending} onPress={handleSubmit((input) => mutation.mutate(input))}>
        Enviar código de redefinição
      </Button>

      <Link href="/login" className="pt-2 text-center">
        <ThemedText type="linkPrimary">Voltar para o login</ThemedText>
      </Link>
    </View>
  );
}
