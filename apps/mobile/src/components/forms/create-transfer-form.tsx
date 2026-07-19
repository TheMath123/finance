import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { MoneyField } from '@/components/form/money-field';
import { SelectField } from '@/components/form/select-field';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/session';
import { accountsApi } from '@/lib/accounts-api';
import { ApiError } from '@/lib/api-client';
import { createTransferSchema, type CreateTransferInput } from '@/lib/schemas/finance';
import { transferApi } from '@/lib/transfer-api';

export function CreateTransferForm({ onDone }: { onDone: () => void }) {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery({
    queryKey: ['accounts', workspaceId],
    queryFn: () => accountsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const { control, handleSubmit } = useForm<CreateTransferInput>({
    resolver: zodResolver(createTransferSchema),
    defaultValues: { recipient: '', amount: 0, description: '', accountId: '' },
  });

  const mutation = useMutation({
    mutationFn: (input: CreateTransferInput) => transferApi.create(workspaceId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['summary', workspaceId] });
      onDone();
    },
  });

  const accountOptions = (accounts ?? [])
    .filter((a) => !a.archivedAt)
    .map((a) => ({ label: a.name, value: a.id }));

  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="recipient"
        label="Destinatário"
        placeholder="Telefone ou e-mail"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <MoneyField control={control} name="amount" label="Valor" />
      <TextField control={control} name="description" label="Descrição" placeholder="Ex.: Aluguel dividido" />
      <SelectField
        control={control}
        name="accountId"
        label="Conta de origem"
        placeholder="Selecione a conta"
        options={accountOptions}
      />
      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError ? mutation.error.message : 'Erro inesperado'}
        </ThemedText>
      )}
      <Button loading={mutation.isPending} onPress={handleSubmit((input) => mutation.mutate(input))}>
        Enviar transferência
      </Button>
    </View>
  );
}
