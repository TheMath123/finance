import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { SelectField } from '@/components/form/select-field';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import {
  type CreateInviteInput,
  createInviteSchema,
} from '@/lib/schemas/workspace';
import { workspaceApi } from '@/lib/workspace-api';

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'admin' },
  { label: 'Membro', value: 'member' },
  { label: 'Somente leitura', value: 'viewer' },
];

interface CreateInviteFormProps {
  workspaceId: string;
  onDone: () => void;
}

export function CreateInviteForm({
  workspaceId,
  onDone,
}: CreateInviteFormProps) {
  const queryClient = useQueryClient();
  const { control, handleSubmit } = useForm<CreateInviteInput>({
    resolver: zodResolver(createInviteSchema),
    mode: 'onTouched',
    defaultValues: { emailOrPhone: '', role: 'member' },
  });

  const mutation = useMutation({
    mutationFn: (input: CreateInviteInput) =>
      workspaceApi.createInvite(workspaceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace-invites', workspaceId],
      });
      onDone();
    },
  });

  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="emailOrPhone"
        label="E-mail"
        placeholder="pessoa@exemplo.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <SelectField
        control={control}
        name="role"
        label="Papel"
        placeholder="Selecione o papel"
        options={ROLE_OPTIONS}
      />
      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : 'Erro inesperado'}
        </ThemedText>
      )}
      <Button
        loading={mutation.isPending}
        onPress={handleSubmit((input) => mutation.mutate(input))}
      >
        Enviar convite
      </Button>
    </View>
  );
}
