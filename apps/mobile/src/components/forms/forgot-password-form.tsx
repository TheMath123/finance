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
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/schemas/auth';

export function ForgotPasswordForm() {
  const { control, handleSubmit } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: authApi.forgotPassword,
  });

  if (mutation.isSuccess) {
    return (
      <View className="gap-4">
        <ThemedText type="small" themeColor="textSecondary">
          Se esse e-mail existir na nossa base, você vai receber um link com as instruções de
          redefinição de senha.
        </ThemedText>

        <Link href="/reset-password" className="pt-2 text-center">
          <ThemedText type="linkPrimary">Já tenho um token de redefinição</ThemedText>
        </Link>

        <Link href="/login" className="text-center">
          <ThemedText type="linkPrimary">Voltar para o login</ThemedText>
        </Link>
      </View>
    );
  }

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
        Enviar link de redefinição
      </Button>

      <Link href="/login" className="pt-2 text-center">
        <ThemedText type="linkPrimary">Voltar para o login</ThemedText>
      </Link>
    </View>
  );
}
