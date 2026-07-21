import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { CodeField } from '@/components/form/code-field';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { verifyResetCodeSchema, type VerifyResetCodeInput } from '@/lib/schemas/auth';

interface ResetPasswordFormProps {
  /** Pré-preenchido quando a tela anterior (esqueci minha senha) já capturou o e-mail. */
  defaultEmail?: string;
  /** Pré-preenchido quando o usuário volta pra esta tela após reenviar o código. */
  defaultCode?: string;
}

/** Passo 1 do reset: confirmar e-mail + código recebido, antes de definir a nova senha. */
export function ResetPasswordForm({ defaultEmail, defaultCode }: ResetPasswordFormProps) {
  const router = useRouter();
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const { control, handleSubmit, getValues } = useForm<VerifyResetCodeInput>({
    resolver: zodResolver(verifyResetCodeSchema),
    mode: 'onTouched',
    defaultValues: { email: defaultEmail ?? '', code: defaultCode ?? '' },
  });

  const verifyMutation = useMutation({
    mutationFn: authApi.verifyResetCode,
    onSuccess: (_data, variables) => {
      router.push({
        pathname: '/new-password',
        params: { email: variables.email, code: variables.code },
      });
    },
  });

  const onSubmit = handleSubmit((input) => verifyMutation.mutate(input));

  const resendMutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => setResendMessage('Novo código enviado — confira seu e-mail.'),
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
        editable={!defaultEmail}
      />
      <CodeField control={control} name="code" label="Código" onComplete={() => onSubmit()} />

      {verifyMutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {verifyMutation.error instanceof ApiError ? verifyMutation.error.message : 'Erro inesperado'}
        </ThemedText>
      )}

      <Button loading={verifyMutation.isPending} onPress={onSubmit}>
        Verificar código
      </Button>

      {resendMessage && (
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          {resendMessage}
        </ThemedText>
      )}

      <Button
        variant="ghost"
        loading={resendMutation.isPending}
        onPress={() => {
          const email = getValues('email');
          if (email) resendMutation.mutate({ email });
        }}>
        Reenviar código
      </Button>

      <Link href="/login" className="pt-2 text-center">
        <ThemedText type="linkPrimary">Voltar para o login</ThemedText>
      </Link>
    </View>
  );
}
