import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { PasswordField } from '@/components/form/password-field';
import { ThemedText } from '@/components/themed-text';
import { AuthButton } from '@/components/ui/auth-button';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { AUTH_FIELD_CLASSNAME } from '@/lib/auth-field-style';
import { type NewPasswordInput, newPasswordSchema } from '@/lib/schemas/auth';

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
    mutationFn: (input: NewPasswordInput) =>
      authApi.resetPassword({ email, code, password: input.password }),
    onSuccess: () => router.replace('/login'),
  });

  return (
    <View className="gap-4">
      <PasswordField
        control={control}
        name="password"
        placeholder="Crie uma senha"
        className={AUTH_FIELD_CLASSNAME}
        autoComplete="new-password"
        showRequirements
      />
      <PasswordField
        control={control}
        name="confirmPassword"
        placeholder="Repita a nova senha"
        className={AUTH_FIELD_CLASSNAME}
        autoComplete="new-password"
      />

      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : 'Erro inesperado'}
        </ThemedText>
      )}

      <AuthButton
        loading={mutation.isPending}
        onPress={handleSubmit((input) => mutation.mutate(input))}
      >
        Redefinir senha
      </AuthButton>
    </View>
  );
}
