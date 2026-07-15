import { zodResolver } from '@hookform/resolvers/zod';
import { BANK_CATALOG } from '@finance/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { SelectField } from '@/components/form/select-field';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { banksApi, type Bank } from '@/lib/banks-api';
import { bankSchema, type BankInput } from '@/lib/schemas/finance';

const BANK_OPTIONS = BANK_CATALOG.map((bank) => ({ label: bank.name, value: bank.code }));

export function CreateBankForm({ bank, onDone }: { bank?: Bank; onDone: () => void }) {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const { control, handleSubmit } = useForm<BankInput>({
    resolver: zodResolver(bankSchema),
    defaultValues: { name: bank?.name ?? '', bankCode: bank?.bankCode ?? '' },
  });

  const mutation = useMutation({
    mutationFn: (input: BankInput) =>
      bank ? banksApi.update(workspaceId!, bank.id, input) : banksApi.create(workspaceId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks', workspaceId] });
      onDone();
    },
  });

  return (
    <View className="gap-4">
      <TextField control={control} name="name" label="Apelido" placeholder="Ex.: Nubank pessoal" />
      <SelectField
        control={control}
        name="bankCode"
        label="Banco"
        placeholder="Selecione o banco"
        options={BANK_OPTIONS}
      />
      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError ? mutation.error.message : 'Erro inesperado'}
        </ThemedText>
      )}
      <Button loading={mutation.isPending} onPress={handleSubmit((input) => mutation.mutate(input))}>
        {bank ? 'Salvar alterações' : 'Adicionar banco'}
      </Button>
    </View>
  );
}
