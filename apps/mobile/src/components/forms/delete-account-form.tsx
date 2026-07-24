import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, View } from 'react-native';

import { CodeField } from '@/components/form/code-field';
import { PasswordField } from '@/components/form/password-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import {
  type ConfirmAccountDeletionInput,
  confirmAccountDeletionSchema,
  type RequestAccountDeletionInput,
  requestAccountDeletionSchema,
} from '@/lib/schemas/auth';

/**
 * Exclusão de conta em duas etapas: reautentica com a senha, manda um código de
 * 6 dígitos pro próprio e-mail cadastrado, e só apaga a conta quando o código
 * é confirmado (mesmo mecanismo da troca de e-mail — prova que quem está
 * pedindo a exclusão realmente tem acesso à conta).
 */
export function DeleteAccountForm() {
  const { signOut } = useSession();
  // Guardado só em memória (nunca persistido) pra permitir "Reenviar código" sem pedir a senha de novo.
  const [password, setPassword] = useState<string | null>(null);

  const requestForm = useForm<RequestAccountDeletionInput>({
    resolver: zodResolver(requestAccountDeletionSchema),
    mode: 'onTouched',
    defaultValues: { password: '' },
  });

  const confirmForm = useForm<ConfirmAccountDeletionInput>({
    resolver: zodResolver(confirmAccountDeletionSchema),
    mode: 'onTouched',
    defaultValues: { code: '' },
  });

  const requestMutation = useMutation({
    mutationFn: authApi.requestAccountDeletion,
    onSuccess: (_data, variables) => setPassword(variables.password),
  });

  const confirmMutation = useMutation({
    mutationFn: authApi.confirmAccountDeletion,
    onSuccess: async () => {
      // Conta já foi apagada no backend — só limpa a sessão local; a rota
      // de logout pode falhar silenciosamente (refresh token já não existe).
      await signOut();
    },
  });

  const confirmOnSubmit = confirmForm.handleSubmit((input) => {
    Alert.alert(
      'Excluir sua conta?',
      'Essa ação é irreversível. Todos os seus dados — transações, contas, cartões, categorias e faturas — serão apagados permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir conta',
          style: 'destructive',
          onPress: () => confirmMutation.mutate(input),
        },
      ]
    );
  });

  if (password) {
    return (
      <View className="gap-4">
        <ThemedText type="small" themeColor="textSecondary">
          Enviamos um código de confirmação para o seu e-mail cadastrado. Cole o
          código abaixo para excluir a conta definitivamente.
        </ThemedText>
        <CodeField
          control={confirmForm.control}
          name="code"
          label="Código"
          onComplete={() => confirmOnSubmit()}
        />

        {confirmMutation.isError && (
          <ThemedText type="small" style={{ color: '#DC2626' }}>
            {confirmMutation.error instanceof ApiError
              ? confirmMutation.error.message
              : 'Erro inesperado'}
          </ThemedText>
        )}

        <Button
          variant="destructive"
          loading={confirmMutation.isPending}
          onPress={confirmOnSubmit}
        >
          Excluir conta definitivamente
        </Button>
        <Button
          variant="ghost"
          loading={requestMutation.isPending}
          onPress={() => requestMutation.mutate({ password })}
        >
          Reenviar código
        </Button>
        <Button variant="ghost" onPress={() => setPassword(null)}>
          Cancelar
        </Button>
      </View>
    );
  }

  return (
    <View className="gap-4">
      <PasswordField
        control={requestForm.control}
        name="password"
        label="Confirme sua senha"
        placeholder="Sua senha atual"
        autoComplete="current-password"
      />

      {requestMutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {requestMutation.error instanceof ApiError
            ? requestMutation.error.message
            : 'Erro inesperado'}
        </ThemedText>
      )}

      <Button
        variant="destructive"
        loading={requestMutation.isPending}
        onPress={requestForm.handleSubmit((input) =>
          requestMutation.mutate(input)
        )}
      >
        Enviar código de confirmação
      </Button>
    </View>
  );
}
