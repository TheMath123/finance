import { zodResolver } from '@hookform/resolvers/zod';
import { ACCOUNT_TYPES } from '@finance/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import type { Bank } from '@/lib/banks-api';
import { accountSchema, type AccountInput } from '@/lib/schemas/finance';

const TYPE_LABELS: Record<(typeof ACCOUNT_TYPES)[number], string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  payment: 'Conta de pagamento',
};
const TYPE_OPTIONS = ACCOUNT_TYPES.map((type) => ({ label: TYPE_LABELS[type], value: type }));

export function CreateAccountForm({ banks, onDone }: { banks: Bank[]; onDone: () => void }) {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const { control, handleSubmit } = useForm<AccountInput>({
    resolver: zodResolver(accountSchema),
    defaultValues: { name: '', bankId: '', type: 'checking', initialBalance: 0 },
  });

  const mutation = useMutation({
    mutationFn: (input: AccountInput) => accountsApi.create(workspaceId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['summary', workspaceId] });
      onDone();
    },
  });

  const bankOptions = banks.map((bank) => ({ label: bank.name, value: bank.id }));

  return (
    <View className="gap-4">
      <TextField control={control} name="name" label="Nome" placeholder="Ex.: Conta corrente" />
      <SelectField
        control={control}
        name="bankId"
        label="Banco"
        placeholder="Selecione o banco"
        options={bankOptions}
      />
      <SelectField control={control} name="type" label="Tipo" options={TYPE_OPTIONS} />
      <MoneyField control={control} name="initialBalance" label="Saldo inicial" />
      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError ? mutation.error.message : 'Erro inesperado'}
        </ThemedText>
      )}
      <Button loading={mutation.isPending} onPress={handleSubmit((input) => mutation.mutate(input))}>
        Adicionar conta
      </Button>
    </View>
  );
}
