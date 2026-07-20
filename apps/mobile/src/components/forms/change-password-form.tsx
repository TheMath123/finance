import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { PasswordField } from '@/components/form/password-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/schemas/auth';

const emptyValues: ChangePasswordInput = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
};

/**
 * Troca de senha a partir do perfil (usuário já logado) — reautentica com a
 * senha atual (diferente do fluxo "esqueci minha senha"). O backend mantém só
 * a sessão atual viva e revoga as demais.
 */
export function ChangePasswordForm() {
  const { control, handleSubmit, reset } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: emptyValues,
  });

  const mutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => reset(emptyValues),
  });

  return (
    <View className="gap-4">
      <PasswordField
        control={control}
        name="currentPassword"
        label="Senha atual"
        placeholder="Sua senha atual"
        autoComplete="current-password"
      />
      <PasswordField
        control={control}
        name="newPassword"
        label="Nova senha"
        placeholder="Mínimo de 8 caracteres"
        autoComplete="new-password"
        showStrength
      />
      <PasswordField
        control={control}
        name="confirmNewPassword"
        label="Confirmar nova senha"
        placeholder="Repita a nova senha"
        autoComplete="new-password"
      />

      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError ? mutation.error.message : 'Erro inesperado'}
        </ThemedText>
      )}
      {mutation.isSuccess && (
        <ThemedText type="small" themeColor="textSecondary">
          Senha alterada. Suas outras sessões foram encerradas.
        </ThemedText>
      )}

      <Button loading={mutation.isPending} onPress={handleSubmit((input) => mutation.mutate(input))}>
        Alterar senha
      </Button>
    </View>
  );
}
