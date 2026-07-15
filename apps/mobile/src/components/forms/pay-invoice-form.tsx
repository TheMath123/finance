import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { DateField } from '@/components/form/date-field';
import { SelectField } from '@/components/form/select-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/session';
import type { Account } from '@/lib/accounts-api';
import { ApiError } from '@/lib/api-client';
import { cardsApi } from '@/lib/cards-api';
import { payInvoiceSchema, type PayInvoiceInput } from '@/lib/schemas/finance';

const METHOD_OPTIONS = [
  { label: 'Pix', value: 'pix' },
  { label: 'Débito', value: 'debit' },
];

export function PayInvoiceForm({
  invoiceId,
  accounts,
  onDone,
}: {
  invoiceId: string;
  accounts: Account[];
  onDone: () => void;
}) {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const { control, handleSubmit } = useForm<PayInvoiceInput>({
    resolver: zodResolver(payInvoiceSchema),
    defaultValues: { accountId: '', date: today, method: 'pix' },
  });

  const mutation = useMutation({
    mutationFn: (input: PayInvoiceInput) => cardsApi.payInvoice(workspaceId!, invoiceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['cards', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['summary', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
      onDone();
    },
  });

  const accountOptions = accounts.map((account) => ({ label: account.name, value: account.id }));

  return (
    <View className="gap-4">
      <SelectField
        control={control}
        name="accountId"
        label="Conta"
        placeholder="Selecione a conta"
        options={accountOptions}
      />
      <DateField control={control} name="date" label="Data" />
      <SelectField control={control} name="method" label="Método" options={METHOD_OPTIONS} />
      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError ? mutation.error.message : 'Erro inesperado'}
        </ThemedText>
      )}
      <Button loading={mutation.isPending} onPress={handleSubmit((input) => mutation.mutate(input))}>
        Pagar fatura
      </Button>
    </View>
  );
}
