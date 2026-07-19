import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { DateField } from '@/components/form/date-field';
import { MoneyField } from '@/components/form/money-field';
import { SelectField } from '@/components/form/select-field';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { useCategories } from '@/lib/hooks/use-categories';
import { editTransactionSchema, type EditTransactionInput } from '@/lib/schemas/finance';
import { transactionsApi, type Transaction } from '@/lib/transactions-api';
import { AttachmentField } from './attachment-field';
import { CreateSplitForm } from './create-split-form';

/**
 * Só descrição, valor, categoria e data são editáveis (tipo/método/conta
 * não mudam depois de criada — regra da API).
 */
export function EditTransactionForm({
  transaction,
  onDone,
  onDelete,
}: {
  transaction: Transaction;
  onDone: () => void;
  onDelete?: () => void;
}) {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const [splitting, setSplitting] = useState(false);

  const { data: categories } = useCategories(workspaceId);

  const { control, handleSubmit } = useForm<EditTransactionInput>({
    resolver: zodResolver(editTransactionSchema),
    defaultValues: {
      description: transaction.description,
      amount: transaction.amount,
      categoryId: transaction.categoryId,
      date: transaction.date,
    },
  });

  const mutation = useMutation({
    mutationFn: (input: EditTransactionInput) =>
      transactionsApi.update(workspaceId!, transaction.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['summary', workspaceId] });
      onDone();
    },
  });

  const categoryOptions = (categories ?? []).map((c) => ({ label: c.name, value: c.id }));
  const canSplit = transaction.type === 'expense' && Boolean(transaction.accountId);

  if (splitting) {
    return <CreateSplitForm transaction={transaction} onDone={onDone} />;
  }

  return (
    <View className="gap-4">
      <TextField control={control} name="description" label="Descrição" placeholder="Ex.: Mercado" />
      <MoneyField control={control} name="amount" label="Valor" />
      <SelectField
        control={control}
        name="categoryId"
        label="Categoria"
        placeholder="Selecione a categoria"
        options={categoryOptions}
      />
      <DateField control={control} name="date" label="Data" />
      <AttachmentField workspaceId={workspaceId!} transaction={transaction} />
      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError ? mutation.error.message : 'Erro inesperado'}
        </ThemedText>
      )}
      <Button loading={mutation.isPending} onPress={handleSubmit((input) => mutation.mutate(input))}>
        Salvar alterações
      </Button>
      {canSplit && (
        <Button variant="outline" onPress={() => setSplitting(true)}>
          Dividir com outras pessoas
        </Button>
      )}
      {onDelete && (
        <Button variant="ghost" textClassName="text-destructive" onPress={onDelete}>
          Excluir transação
        </Button>
      )}
    </View>
  );
}
