import { zodResolver } from '@hookform/resolvers/zod';
import { RECURRENCE_FREQUENCIES, TRANSACTION_TYPES } from '@finance/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useController, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { CheckboxField } from '@/components/form/checkbox-field';
import { MoneyField } from '@/components/form/money-field';
import { SelectField } from '@/components/form/select-field';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { NumberInput } from '@/components/ui/number-input';
import { Select } from '@/components/ui/select';
import { useSession } from '@/context/session';
import { accountsApi } from '@/lib/accounts-api';
import { ApiError } from '@/lib/api-client';
import { cardsApi } from '@/lib/cards-api';
import { categoriesApi } from '@/lib/categories-api';
import { recurringApi, type RecurringTransaction } from '@/lib/recurring-api';
import { recurringSchema, type RecurringInput } from '@/lib/schemas/finance';

const TYPE_LABELS: Record<(typeof TRANSACTION_TYPES)[number], string> = {
  income: 'Receita',
  expense: 'Despesa',
};
const TYPE_OPTIONS = TRANSACTION_TYPES.map((type) => ({ label: TYPE_LABELS[type], value: type }));

const RECURRING_METHOD_LABELS: Record<'pix' | 'debit' | 'cash' | 'credit', string> = {
  pix: 'Pix',
  debit: 'Débito',
  cash: 'Dinheiro',
  credit: 'Crédito',
};
const METHOD_OPTIONS = Object.entries(RECURRING_METHOD_LABELS).map(([value, label]) => ({ label, value }));

const FREQUENCY_LABELS: Record<(typeof RECURRENCE_FREQUENCIES)[number], string> = {
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};
const FREQUENCY_OPTIONS = RECURRENCE_FREQUENCIES.map((frequency) => ({
  label: FREQUENCY_LABELS[frequency],
  value: frequency,
}));

const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
const MONTH_OPTIONS = MONTH_LABELS.map((label, index) => ({ label, value: String(index + 1) }));

const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/** Dia do mês (1-31) pra monthly/yearly, ou dia da semana 0-6 pra weekly. */
function DayOfReferenceField({
  control,
  frequency,
}: {
  control: ReturnType<typeof useForm<RecurringInput>>['control'];
  frequency: RecurringInput['frequency'];
}) {
  const { field, fieldState } = useController({ control, name: 'dayOfReference' });
  const isWeekly = frequency === 'weekly';

  return (
    <View className="gap-1.5">
      <ThemedText type="smallBold">{isWeekly ? 'Dia da semana' : 'Dia do mês'}</ThemedText>
      {isWeekly ? (
        <Select
          className={fieldState.error ? 'border-destructive' : undefined}
          placeholder="Selecione o dia da semana"
          options={WEEKDAY_LABELS.map((label, value) => ({ label, value: String(value) }))}
          value={field.value !== undefined ? String(field.value) : undefined}
          onValueChange={(value) => field.onChange(Number(value))}
        />
      ) : (
        <NumberInput value={field.value} onValueChange={field.onChange} min={1} max={31} />
      )}
      {fieldState.error?.message && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {fieldState.error.message}
        </ThemedText>
      )}
    </View>
  );
}

function MonthOfReferenceField({ control }: { control: ReturnType<typeof useForm<RecurringInput>>['control'] }) {
  const { field, fieldState } = useController({ control, name: 'monthOfReference' });

  return (
    <View className="gap-1.5">
      <ThemedText type="smallBold">Mês</ThemedText>
      <Select
        className={fieldState.error ? 'border-destructive' : undefined}
        placeholder="Selecione o mês"
        options={MONTH_OPTIONS}
        value={field.value !== undefined ? String(field.value) : undefined}
        onValueChange={(value) => field.onChange(Number(value))}
      />
      {fieldState.error?.message && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {fieldState.error.message}
        </ThemedText>
      )}
    </View>
  );
}

/**
 * Formulário de criação e edição de recorrência. Passe `recurring` pra editar
 * uma regra existente (preenche defaultValues e usa PATCH); sem ele, cria uma nova.
 */
export function CreateRecurringForm({
  recurring,
  onDone,
}: {
  recurring?: RecurringTransaction;
  onDone: () => void;
}) {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const isEditing = Boolean(recurring);

  const { data: categories } = useQuery({
    queryKey: ['categories', workspaceId],
    queryFn: () => categoriesApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });
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

  const { control, handleSubmit, setValue } = useForm<RecurringInput>({
    resolver: zodResolver(recurringSchema),
    mode: 'onTouched',
    defaultValues: {
      description: recurring?.description ?? '',
      amount: recurring?.amount ?? 0,
      type: recurring?.type ?? 'expense',
      method: recurring?.method ?? 'pix',
      categoryId: recurring?.categoryId ?? '',
      accountId: recurring?.accountId ?? undefined,
      cardId: recurring?.cardId ?? undefined,
      frequency: recurring?.frequency ?? 'monthly',
      dayOfReference: recurring?.dayOfReference ?? 1,
      monthOfReference: recurring?.monthOfReference ?? undefined,
      active: recurring?.active ?? true,
    },
  });

  const frequency = useWatch({ control, name: 'frequency' });
  const method = useWatch({ control, name: 'method' });
  const isCredit = method === 'credit';

  // Mesma regra do form de transação: crédito manda cardId (nunca accountId).
  useEffect(() => {
    if (isCredit) setValue('accountId', undefined);
    else setValue('cardId', undefined);
  }, [isCredit, setValue]);

  const mutation = useMutation({
    mutationFn: (input: RecurringInput) =>
      isEditing
        ? recurringApi.update(workspaceId!, recurring!.id, input)
        : recurringApi.create(workspaceId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['recurring-pending', workspaceId] });
      onDone();
    },
  });

  const categoryOptions = (categories ?? []).map((c) => ({ label: c.name, value: c.id }));
  const accountOptions = (accounts ?? []).map((a) => ({ label: a.name, value: a.id }));
  const cardOptions = (cards ?? []).map((c) => ({ label: c.name, value: c.id }));

  return (
    <View className="gap-4">
      <TextField control={control} name="description" label="Descrição" placeholder="Ex.: Aluguel" />
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
      {isCredit ? (
        <SelectField
          control={control}
          name="cardId"
          label="Cartão"
          placeholder="Selecione o cartão"
          options={cardOptions}
        />
      ) : (
        <SelectField
          control={control}
          name="accountId"
          label="Conta"
          placeholder="Selecione a conta"
          options={accountOptions}
        />
      )}
      <SelectField control={control} name="frequency" label="Frequência" options={FREQUENCY_OPTIONS} />
      <DayOfReferenceField control={control} frequency={frequency} />
      {frequency === 'yearly' && <MonthOfReferenceField control={control} />}
      {isEditing && <CheckboxField control={control} name="active" label="Recorrência ativa" />}
      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError ? mutation.error.message : 'Erro inesperado'}
        </ThemedText>
      )}
      <Button loading={mutation.isPending} onPress={handleSubmit((input) => mutation.mutate(input))}>
        {isEditing ? 'Salvar alterações' : 'Salvar recorrência'}
      </Button>
    </View>
  );
}
