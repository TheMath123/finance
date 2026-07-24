import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { PasswordField } from '@/components/form/password-field';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { usePersistEmailField } from '@/lib/hooks/use-persist-email-field';
import { type LoginInput, loginSchema } from '@/lib/schemas/auth';
import { lastEmailStore } from '@/lib/secure-store';

export function LoginForm() {
  const { signIn } = useSession();
  const { control, handleSubmit, setValue } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  // Pré-preenche com o último e-mail usado em login/cadastro/esqueci senha.
  useEffect(() => {
    lastEmailStore.getEmail().then((email) => {
      if (email) setValue('email', email);
    });
  }, [setValue]);

  usePersistEmailField(control, 'email');

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: signIn,
  });

  const onSubmit = handleSubmit((input) => mutation.mutate(input));

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
        returnKeyType="next"
      />
      <PasswordField
        control={control}
        name="password"
        label="Senha"
        placeholder="••••••••"
        autoComplete="password"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />

      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : 'Erro inesperado'}
        </ThemedText>
      )}

      <Button loading={mutation.isPending} onPress={onSubmit}>
        Entrar
      </Button>

      <Link href="/register" className="pt-2 text-center">
        <ThemedText type="linkPrimary">
          Ainda não tem conta? Criar conta
        </ThemedText>
      </Link>

      <Link href="/forgot-password" className="text-center">
        <ThemedText type="linkPrimary">Esqueci minha senha</ThemedText>
      </Link>
    </View>
  );
}
