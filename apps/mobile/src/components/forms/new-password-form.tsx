import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { PasswordField } from '@/components/form/password-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { newPasswordSchema, type NewPasswordInput } from '@/lib/schemas/auth';

interface NewPasswordFormProps {
  email: string;
  code: string;
}

/** Passo 2 do reset: já validamos o código na tela anterior; aqui só falta a senha nova. */
export function NewPasswordForm({ email, code }: NewPasswordFormProps) {
  const router = useRouter();
  const { control, handleSubmit } = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    mode: 'onTouched',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    // O código é reenviado aqui pra revalidar (não expirou, ainda é válido) antes de trocar a senha
    mutationFn: (input: NewPasswordInput) =>
      authApi.resetPassword({ email, code, password: input.password }),
    onSuccess: () => router.replace('/login'),
  });

  return (
    <View className="gap-4">
      <PasswordField
        control={control}
        name="password"
        label="Nova senha"
        placeholder="Mínimo de 8 caracteres"
        autoComplete="new-password"
      />
      <PasswordField
        control={control}
        name="confirmPassword"
        label="Confirmar nova senha"
        placeholder="Repita a nova senha"
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
    </View>
  );
}
