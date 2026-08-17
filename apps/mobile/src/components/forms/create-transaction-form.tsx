import { TRANSACTION_TYPES } from '@finance/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { buildCategoryOptions } from '@/lib/category-select-options';
import { useCategories } from '@/lib/hooks/use-categories';
import { formatCents, splitInstallmentsPreview } from '@/lib/money';
import {
  type TransactionInput,
  transactionSchema,
} from '@/lib/schemas/finance';
import { transactionsApi } from '@/lib/transactions-api';

const TYPE_LABELS: Record<(typeof TRANSACTION_TYPES)[number], string> = {
  income: 'Receita',
  expense: 'Despesa',
};
const TYPE_OPTIONS = TRANSACTION_TYPES.map((type) => ({
  label: TYPE_LABELS[type],
  value: type,
}));

/**
 * "transfer" fica fora por enquanto: exige conta origem + destino, e o form
 * ainda não tem esse segundo seletor — ver spec/backlog.
 */
const METHOD_OPTIONS = [
  { label: 'Pix', value: 'pix' },
  { label: 'Débito', value: 'debit' },
  { label: 'Dinheiro', value: 'cash' },
  { label: 'Crédito', value: 'credit' },
];

const INSTALLMENT_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const count = String(index + 1);
  return { label: index === 0 ? 'À vista' : `${count}x`, value: count };
});

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function CreateTransactionForm({
  onDone,
  initialValues,
}: {
  onDone: () => void;
  /** Pré-preenchimento vindo de uma sugestão detectada por notificação (ver notification-suggestions.tsx) — usuário sempre revisa/completa antes de salvar, nada é enviado automaticamente. */
  initialValues?: Partial<
    Pick<TransactionInput, 'description' | 'amount' | 'type' | 'method'>
  >;
}) {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();

  const { data: categories } = useCategories(workspaceId);
  const { data: accounts } = useQuery({
    queryKey: ['accounts', workspaceId],
    queryFn: () => accountsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });
  const { data: cards } = useQuery({
    queryKey: ['cards', workspaceId],
    queryFn: () => cardsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const { control, handleSubmit, setValue } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    mode: 'onTouched',
    defaultValues: {
      description: '',
      amount: 0,
      type: 'expense',
      method: 'pix',
      date: todayIso(),
      categoryId: '',
      accountId: undefined,
      cardId: undefined,
      installments: '1',
      ...initialValues,
    },
  });

  const method = useWatch({ control, name: 'method' });
  const isCredit = method === 'credit';
  const amount = useWatch({ control, name: 'amount' });
  const installments = useWatch({ control, name: 'installments' });

  const installmentCount = Number(installments ?? '1');
  const installmentPreview =
    isCredit && installmentCount > 1 && amount > 0
      ? splitInstallmentsPreview(amount, installmentCount)
      : null;

  // Ao trocar de método, limpa o campo do "modo" anterior — crédito manda cardId
  // (nunca accountId), os demais mandam accountId (nunca cardId); a API rejeita
  // se os dois vierem juntos. Parcelas só fazem sentido no crédito.
  useEffect(() => {
    if (isCredit) setValue('accountId', undefined);
    else {
      setValue('cardId', undefined);
      setValue('installments', '1');
    }
  }, [isCredit, setValue]);

  const mutation = useMutation({
    mutationFn: (input: TransactionInput) =>
      transactionsApi.create(workspaceId!, {
        ...input,
        installments: input.installments
          ? Number(input.installments)
          : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['transactions', workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ['summary', workspaceId] });
      onDone();
    },
  });

  const categoryOptions = buildCategoryOptions(categories);
  const accountOptions = (accounts ?? []).map((a) => ({
    label: a.name,
    value: a.id,
  }));
  const cardOptions = (cards ?? []).map((c) => ({
    label: c.name,
    value: c.id,
  }));

  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="description"
        label="Descrição"
        placeholder="Ex.: Mercado"
      />
      <MoneyField control={control} name="amount" label="Valor" />
      <DateField control={control} name="date" label="Data" />
      <SelectField
        control={control}
        name="type"
        label="Tipo"
        options={TYPE_OPTIONS}
      />
      <SelectField
        control={control}
        name="method"
        label="Método"
        options={METHOD_OPTIONS}
      />
      <SelectField
        control={control}
        name="categoryId"
        label="Categoria"
        placeholder="Selecione a categoria"
        options={categoryOptions}
        searchable
        searchPlaceholder="Buscar categoria..."
      />
      {isCredit ? (
        <>
          <SelectField
            control={control}
            name="cardId"
            label="Cartão"
            placeholder="Selecione o cartão"
            options={cardOptions}
          />
          <SelectField
            control={control}
            name="installments"
            label="Parcelas"
            placeholder="Selecione as parcelas"
            options={INSTALLMENT_OPTIONS}
          />
          {installmentPreview && (
            <ThemedText type="small">
              {installmentPreview.length}x de{' '}
              {formatCents(installmentPreview[1] ?? installmentPreview[0]!)}
              {installmentPreview[0] !==
                (installmentPreview[1] ?? installmentPreview[0]) &&
                ` — 1ª parcela ${formatCents(installmentPreview[0]!)}`}
            </ThemedText>
          )}
        </>
      ) : (
        <SelectField
          control={control}
          name="accountId"
          label="Conta"
          placeholder="Selecione a conta"
          options={accountOptions}
        />
      )}
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
        Salvar transação
      </Button>
    </View>
  );
}
