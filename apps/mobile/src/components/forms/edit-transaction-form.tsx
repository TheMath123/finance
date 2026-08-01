import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { accountsApi } from '@/lib/accounts-api';
import { ApiError } from '@/lib/api-client';
import { cardsApi } from '@/lib/cards-api';
import { useCategories } from '@/lib/hooks/use-categories';
import {
  type EditTransactionInput,
  editTransactionSchema,
  type InstallmentTotalInput,
  installmentTotalSchema,
} from '@/lib/schemas/finance';
import { type Transaction, transactionsApi } from '@/lib/transactions-api';
import { AttachmentField } from './attachment-field';
import { CreateSplitForm } from './create-split-form';

/**
 * Tipo/método nunca mudam depois de criada (regra da API). Conta (métodos
 * não-crédito, exceto transferência) e cartão (crédito avulsa, não
 * parcela) já podem — ver `updateTransaction` no backend (auditoria
 * 2026-07-20).
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
  const [editingInstallmentTotal, setEditingInstallmentTotal] = useState(false);

  const { data: categories } = useCategories(workspaceId);

  const isCredit = transaction.method === 'credit';
  const isTransfer = transaction.method === 'transfer';
  const isParceled = transaction.installmentGroupId !== null;
  const canEditAccount = !isCredit && !isTransfer;
  const canEditCard = isCredit && !isParceled;

  const { data: accounts } = useQuery({
    queryKey: ['accounts', workspaceId],
    queryFn: () => accountsApi.list(workspaceId!),
    enabled: Boolean(workspaceId) && canEditAccount,
  });
  const { data: cards } = useQuery({
    queryKey: ['cards', workspaceId],
    queryFn: () => cardsApi.list(workspaceId!),
    enabled: Boolean(workspaceId) && canEditCard,
  });

  const { control, handleSubmit } = useForm<EditTransactionInput>({
    resolver: zodResolver(editTransactionSchema),
    mode: 'onTouched',
    defaultValues: {
      description: transaction.description,
      amount: transaction.amount,
      categoryId: transaction.categoryId,
      date: transaction.date,
      accountId: canEditAccount
        ? (transaction.accountId ?? undefined)
        : undefined,
      cardId: canEditCard ? (transaction.cardId ?? undefined) : undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: (input: EditTransactionInput) =>
      transactionsApi.update(workspaceId!, transaction.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['transactions', workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ['summary', workspaceId] });
      onDone();
    },
  });

  const {
    control: installmentTotalControl,
    handleSubmit: handleInstallmentTotalSubmit,
  } = useForm<InstallmentTotalInput>({
    resolver: zodResolver(installmentTotalSchema),
    mode: 'onTouched',
    defaultValues: { newTotalAmount: 0 },
  });

  const installmentTotalMutation = useMutation({
    mutationFn: (input: InstallmentTotalInput) =>
      transactionsApi.updateInstallmentTotal(
        workspaceId!,
        transaction.id,
        input.newTotalAmount
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['transactions', workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ['summary', workspaceId] });
      onDone();
    },
  });

  const categoryOptions = (categories ?? []).map((c) => ({
    label: c.name,
    value: c.id,
  }));
  const accountOptions = (accounts ?? []).map((a) => ({
    label: a.name,
    value: a.id,
  }));
  const cardOptions = (cards ?? []).map((c) => ({
    label: c.name,
    value: c.id,
  }));
  const canSplit =
    transaction.type === 'expense' && Boolean(transaction.accountId);

  if (splitting) {
    return <CreateSplitForm transaction={transaction} onDone={onDone} />;
  }

  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="description"
        label="Descrição"
        placeholder="Ex.: Mercado"
      />
      <MoneyField control={control} name="amount" label="Valor" />
      {isParceled && (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            Parcela {transaction.installmentNumber} de{' '}
            {transaction.installmentTotal} — o valor acima é só desta parcela.
          </ThemedText>
          <Button
            variant="outline"
            onPress={() => setEditingInstallmentTotal((v) => !v)}
          >
            {editingInstallmentTotal
              ? 'Cancelar alteração de valor'
              : 'Alterar valor total da compra'}
          </Button>
          {editingInstallmentTotal && (
            <View className="gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <MoneyField
                control={installmentTotalControl}
                name="newTotalAmount"
                label="Novo valor total da compra"
              />
              <ThemedText type="small" themeColor="textSecondary">
                O novo total é redividido só entre as parcelas ainda não pagas —
                parcelas já pagas continuam com o valor original.
              </ThemedText>
              {installmentTotalMutation.isError && (
                <ThemedText type="small" style={{ color: '#DC2626' }}>
                  {installmentTotalMutation.error instanceof ApiError
                    ? installmentTotalMutation.error.message
                    : 'Erro inesperado'}
                </ThemedText>
              )}
              <Button
                loading={installmentTotalMutation.isPending}
                onPress={handleInstallmentTotalSubmit((input) =>
                  installmentTotalMutation.mutate(input)
                )}
              >
                Confirmar novo valor total
              </Button>
            </View>
          )}
        </>
      )}
      <SelectField
        control={control}
        name="categoryId"
        label="Categoria"
        placeholder="Selecione a categoria"
        options={categoryOptions}
      />
      <DateField control={control} name="date" label="Data" />
      {canEditAccount && (
        <SelectField
          control={control}
          name="accountId"
          label="Conta"
          placeholder="Selecione a conta"
          options={accountOptions}
        />
      )}
      {canEditCard && (
        <SelectField
          control={control}
          name="cardId"
          label="Cartão"
          placeholder="Selecione o cartão"
          options={cardOptions}
        />
      )}
      {isCredit && isParceled && (
        <ThemedText type="small" themeColor="textSecondary">
          Cartão travado — compra parcelada não pode trocar de cartão.
        </ThemedText>
      )}
      <AttachmentField workspaceId={workspaceId!} transaction={transaction} />
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
        Salvar alterações
      </Button>
      {canSplit && (
        <Button variant="outline" onPress={() => setSplitting(true)}>
          Dividir com outras pessoas
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          textClassName="text-destructive"
          onPress={onDelete}
        >
          Excluir transação
        </Button>
      )}
    </View>
  );
}
