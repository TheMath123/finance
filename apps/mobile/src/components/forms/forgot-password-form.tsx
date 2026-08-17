import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { EnvelopeSimpleIcon } from 'phosphor-react-native';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { AuthButton } from '@/components/ui/auth-button';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { AUTH_FIELD_CLASSNAME } from '@/lib/auth-field-style';
import { usePersistEmailField } from '@/lib/hooks/use-persist-email-field';
import {
  type ForgotPasswordInput,
  forgotPasswordSchema,
} from '@/lib/schemas/auth';
import { lastEmailStore } from '@/lib/secure-store';

export function ForgotPasswordForm() {
  const router = useRouter();
  const theme = useTheme();
  const { control, handleSubmit, setValue } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  });

  // Pré-preenche com o último e-mail usado em login/cadastro/esqueci senha.
  useEffect(() => {
    lastEmailStore.getEmail().then((email) => {
      if (email) setValue('email', email);
    });
  }, [setValue]);

  usePersistEmailField(control, 'email');

  const mutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: (_data, variables) => {
      router.push({
        pathname: '/reset-password',
        params: { email: variables.email },
      });
    },
  });

  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="email"
        placeholder="E-mail"
        className={AUTH_FIELD_CLASSNAME}
        trailingIcon={
          <EnvelopeSimpleIcon size={18} color={theme.textSecondary} />
        }
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
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
        Enviar código de redefinição
      </AuthButton>

      <Link href="/login" className="pt-2 text-center">
        <ThemedText type="linkPrimary">Voltar para o login</ThemedText>
      </Link>
    </View>
  );
}
