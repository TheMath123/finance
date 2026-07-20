import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { CodeField } from '@/components/form/code-field';
import { PasswordField } from '@/components/form/password-field';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import {
  confirmEmailChangeSchema,
  requestEmailChangeSchema,
  type ConfirmEmailChangeInput,
  type RequestEmailChangeInput,
} from '@/lib/schemas/auth';

/**
 * Troca de e-mail em duas etapas: pede o e-mail novo, depois confirma com o
 * código de 6 dígitos enviado pra ele (mesmo mecanismo do reset de senha) —
 * prova que o usuário é dono do e-mail novo antes de qualquer coisa valer.
 */
export function ChangeEmailForm() {
  const { user, refreshUser } = useSession();
  // Retoma direto na etapa de confirmação se já existir uma troca pendente do backend.
  const [pendingEmail, setPendingEmail] = useState<string | null>(user?.pendingEmail ?? null);
  // Guardado só em memória (nunca persistido) pra permitir "Reenviar código" sem
  // pedir a senha de novo dentro da mesma sessão de troca.
  const [currentPassword, setCurrentPassword] = useState<string | null>(null);

  const requestForm = useForm<RequestEmailChangeInput>({
    resolver: zodResolver(requestEmailChangeSchema),
    defaultValues: { newEmail: '', currentPassword: '' },
  });

  const confirmForm = useForm<ConfirmEmailChangeInput>({
    resolver: zodResolver(confirmEmailChangeSchema),
    defaultValues: { code: '' },
  });

  const requestMutation = useMutation({
    mutationFn: authApi.requestEmailChange,
    onSuccess: (_data, variables) => {
      setPendingEmail(variables.newEmail);
      setCurrentPassword(variables.currentPassword);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: authApi.confirmEmailChange,
    onSuccess: async () => {
      await refreshUser();
      setPendingEmail(null);
      requestForm.reset({ newEmail: '' });
      confirmForm.reset({ code: '' });
    },
  });

  if (pendingEmail) {
    return (
      <View className="gap-4">
        <ThemedText type="small" themeColor="textSecondary">
          Enviamos um código para {pendingEmail}. Cole o código abaixo para confirmar a troca.
        </ThemedText>
        <CodeField control={confirmForm.control} name="code" label="Código" />

        {confirmMutation.isError && (
          <ThemedText type="small" style={{ color: '#DC2626' }}>
            {confirmMutation.error instanceof ApiError ? confirmMutation.error.message : 'Erro inesperado'}
          </ThemedText>
        )}

        <Button
          loading={confirmMutation.isPending}
          onPress={confirmForm.handleSubmit((input) => confirmMutation.mutate(input))}>
          Confirmar novo e-mail
        </Button>
        {currentPassword && (
          <Button
            variant="ghost"
            loading={requestMutation.isPending}
            onPress={() => requestMutation.mutate({ newEmail: pendingEmail, currentPassword })}>
            Reenviar código
          </Button>
        )}
        <Button
          variant="ghost"
          onPress={() => {
            setPendingEmail(null);
            setCurrentPassword(null);
          }}>
          Usar outro e-mail
        </Button>
      </View>
    );
  }

  return (
    <View className="gap-4">
      <TextField
        control={requestForm.control}
        name="newEmail"
        label="Novo e-mail"
        placeholder="novo@exemplo.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <PasswordField
        control={requestForm.control}
        name="currentPassword"
        label="Senha atual"
        placeholder="Confirme sua senha atual"
        autoComplete="current-password"
      />

      {requestMutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {requestMutation.error instanceof ApiError ? requestMutation.error.message : 'Erro inesperado'}
        </ThemedText>
      )}

      <Button
        loading={requestMutation.isPending}
        onPress={requestForm.handleSubmit((input) => requestMutation.mutate(input))}>
        Enviar código de confirmação
      </Button>
    </View>
  );
}
