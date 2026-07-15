import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import { Pressable } from 'react-native';

import { TextField } from '@/components/form/text-field';
import { PasswordField } from '@/components/form/password-field';
import { ThemedText } from '@/components/themed-text';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { loginSchema, type LoginInput } from '@/lib/schemas/auth';

export function LoginForm() {
  const { signIn } = useSession();
  const { control, handleSubmit } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: signIn,
  });

  return (
    <>
      <TextField
        control={control}
        name="email"
        placeholder="E-mail"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <PasswordField control={control} name="password" placeholder="Senha" autoComplete="password" />

      {mutation.isError && (
        <ThemedText type="small" themeColor="textSecondary">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Erro inesperado'}
        </ThemedText>
      )}

      <Pressable
        className="items-center rounded-xl bg-blue-600 py-3 disabled:opacity-50"
        disabled={mutation.isPending}
        onPress={handleSubmit((input) => mutation.mutate(input))}>
        <ThemedText type="smallBold" style={{ color: 'white' }}>
          {mutation.isPending ? 'Entrando…' : 'Entrar'}
        </ThemedText>
      </Pressable>

      <Link href="/register" className="text-center">
        <ThemedText type="linkPrimary">Criar conta</ThemedText>
      </Link>
    </>
  );
}
