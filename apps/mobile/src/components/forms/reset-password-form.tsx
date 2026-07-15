import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { PasswordField } from '@/components/form/password-field';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/schemas/auth';

export function ResetPasswordForm() {
  const router = useRouter();
  const { control, handleSubmit } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => router.replace('/login'),
  });

  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="token"
        label="Token"
        placeholder="Cole aqui o token recebido por e-mail"
        autoCapitalize="none"
      />
      <PasswordField
        control={control}
        name="password"
        label="Nova senha"
        placeholder="Mínimo de 8 caracteres"
        autoComplete="new-password"
      />

      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError ? mutation.error.message : 'Erro inesperado'}
        </ThemedText>
      )}

      <Button loading={mutation.isPending} onPress={handleSubmit((input) => mutation.mutate(input))}>
        Redefinir senha
      </Button>

      <Link href="/login" className="pt-2 text-center">
        <ThemedText type="linkPrimary">Voltar para o login</ThemedText>
      </Link>
    </View>
  );
}
