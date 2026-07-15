import { zodResolver } from '@hookform/resolvers/zod';
import { TRANSACTION_METHODS, TRANSACTION_TYPES } from '@finance/shared';
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
import { useCategories } from '@/lib/hooks/use-categories';
import { transactionSchema, type TransactionInput } from '@/lib/schemas/finance';
import { transactionsApi } from '@/lib/transactions-api';

const TYPE_LABELS: Record<(typeof TRANSACTION_TYPES)[number], string> = {
  income: 'Receita',
  expense: 'Despesa',
};
const TYPE_OPTIONS = TRANSACTION_TYPES.map((type) => ({ label: TYPE_LABELS[type], value: type }));

const METHOD_LABELS: Record<(typeof TRANSACTION_METHODS)[number], string> = {
  pix: 'Pix',
  debit: 'Débito',
  cash: 'Dinheiro',
  credit: 'Crédito',
  transfer: 'Transferência',
};
const METHOD_OPTIONS = TRANSACTION_METHODS.map((method) => ({ label: METHOD_LABELS[method], value: method }));

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function CreateTransactionForm({ onDone }: { onDone: () => void }) {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();

  const { data: categories } = useCategories(workspaceId);
  const { data: accounts } = useQuery({
    queryKey: ['accounts', workspaceId],
    queryFn: () => accountsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const { control, handleSubmit } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: '',
      amount: 0,
      type: 'expense',
      method: 'pix',
      date: todayIso(),
      categoryId: '',
      accountId: undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: (input: TransactionInput) => transactionsApi.create(workspaceId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['summary', workspaceId] });
      onDone();
    },
  });

  const categoryOptions = (categories ?? []).map((c) => ({ label: c.name, value: c.id }));
  const accountOptions = (accounts ?? []).map((a) => ({ label: a.name, value: a.id }));

  return (
    <View className="gap-4">
      <TextField control={control} name="description" label="Descrição" placeholder="Ex.: Mercado" />
      <MoneyField control={control} name="amount" label="Valor" />
      <SelectField control={control} name="type" label="Tipo" options={TYPE_OPTIONS} />
      <SelectField control={control} name="method" label="Método" options={METHOD_OPTIONS} />
      <SelectField
        control={control}
        name="categoryId"
        label="Categoria"
        placeholder="Selecione a categoria"
        options={categoryOptions}
      />
      <SelectField
        control={control}
        name="accountId"
        label="Conta"
        placeholder="Selecione a conta"
        options={accountOptions}
      />
      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError ? mutation.error.message : 'Erro inesperado'}
        </ThemedText>
      )}
      <Button loading={mutation.isPending} onPress={handleSubmit((input) => mutation.mutate(input))}>
        Salvar transação
      </Button>
    </View>
  );
}
