import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { DateField } from '@/components/form/date-field';
import { SelectField } from '@/components/form/select-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useSession } from '@/context/session';
import type { Account } from '@/lib/accounts-api';
import { ApiError } from '@/lib/api-client';
import { cardsApi } from '@/lib/cards-api';
import { type PayInvoiceInput, payInvoiceSchema } from '@/lib/schemas/finance';

const METHOD_OPTIONS = [
  { label: 'Pix', value: 'pix' },
  { label: 'Débito', value: 'debit' },
];

export function PayInvoiceForm({
  invoiceId,
  isEarlyPayment,
  closingDay,
  accounts,
  onDone,
}: {
  invoiceId: string;
  /** Fatura ainda aberta (não fechada) — pagar agora trava novas compras que cairiam nela. */
  isEarlyPayment: boolean;
  closingDay: number;
  accounts: Account[];
  onDone: () => void;
}) {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [confirmedEarlyPayment, setConfirmedEarlyPayment] = useState(false);
  const { control, handleSubmit } = useForm<PayInvoiceInput>({
    resolver: zodResolver(payInvoiceSchema),
    mode: 'onTouched',
    defaultValues: { accountId: '', date: today, method: 'pix' },
  });

  const mutation = useMutation({
    mutationFn: (input: PayInvoiceInput) =>
      cardsApi.payInvoice(workspaceId!, invoiceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['cards', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['summary', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
      onDone();
    },
  });

  const accountOptions = accounts.map((account) => ({
    label: account.name,
    value: account.id,
  }));

  return (
    <View className="gap-4">
      {isEarlyPayment && (
        <View className="gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <ThemedText type="small">
            Essa fatura ainda está aberta (fecha dia {closingDay}). Pagar agora
            trava novas compras que cairiam nela até lá — elas vão falhar até a
            próxima fatura.
          </ThemedText>
          <View className="flex-row items-center gap-2">
            <Checkbox
              checked={confirmedEarlyPayment}
              onCheckedChange={setConfirmedEarlyPayment}
            />
            <ThemedText type="small" className="flex-1 font-medium">
              Entendo, quero pagar mesmo assim
            </ThemedText>
          </View>
        </View>
      )}
      <SelectField
        control={control}
        name="accountId"
        label="Conta"
        placeholder="Selecione a conta"
        options={accountOptions}
      />
      <DateField control={control} name="date" label="Data" />
      <SelectField
        control={control}
        name="method"
        label="Método"
        options={METHOD_OPTIONS}
      />
      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : 'Erro inesperado'}
        </ThemedText>
      )}
      <Button
        disabled={isEarlyPayment && !confirmedEarlyPayment}
        loading={mutation.isPending}
        onPress={handleSubmit((input) => mutation.mutate(input))}
      >
        Pagar fatura
      </Button>
    </View>
  );
}
