import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { CheckboxField } from '@/components/form/checkbox-field';
import { PasswordField } from '@/components/form/password-field';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
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
    <View className="gap-4">
      <TextField control={control} name="name" label="Nome" placeholder="Seu nome" autoComplete="name" />
      <TextField
        control={control}
        name="email"
        label="E-mail"
        placeholder="voce@exemplo.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <PasswordField
        control={control}
        name="password"
        label="Senha"
        placeholder="Mínimo de 8 caracteres"
        autoComplete="new-password"
      />
      <CheckboxField control={control} name="termsAccepted" label="Aceito os termos de uso" />

      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError ? mutation.error.message : 'Erro inesperado'}
        </ThemedText>
      )}

      <Button loading={mutation.isPending} onPress={handleSubmit((input) => mutation.mutate(input))}>
        Criar conta
      </Button>

      <Link href="/login" className="pt-2 text-center">
        <ThemedText type="linkPrimary">Já tenho conta</ThemedText>
      </Link>
    </View>
  );
}
