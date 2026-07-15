import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import { Pressable } from 'react-native';

import { CheckboxField } from '@/components/form/checkbox-field';
import { TextField } from '@/components/form/text-field';
import { PasswordField } from '@/components/form/password-field';
import { ThemedText } from '@/components/themed-text';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { registerSchema, type RegisterInput } from '@/lib/schemas/auth';

export function RegisterForm() {
  const { signIn } = useSession();
  const { control, handleSubmit } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', termsAccepted: false },
  });

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: signIn,
  });

  return (
    <>
      <TextField control={control} name="name" placeholder="Nome" autoComplete="name" />
      <TextField
        control={control}
        name="email"
        placeholder="E-mail"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <PasswordField control={control} name="password" placeholder="Senha" autoComplete="new-password" />
      <CheckboxField control={control} name="termsAccepted" label="Aceito os termos de uso" />

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
          {mutation.isPending ? 'Criando…' : 'Criar conta'}
        </ThemedText>
      </Pressable>

      <Link href="/login" className="text-center">
        <ThemedText type="linkPrimary">Já tenho conta</ThemedText>
      </Link>
    </>
  );
}
