import { BANK_CATALOG } from '@finance/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { MoneyField } from '@/components/form/money-field';
import { SelectField } from '@/components/form/select-field';
import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { type Card, cardsApi } from '@/lib/cards-api';
import { type CardInput, cardSchema } from '@/lib/schemas/finance';

const DAY_OPTIONS = Array.from({ length: 28 }, (_, index) => {
  const day = String(index + 1);
  return { label: day, value: day };
});
const BANK_OPTIONS = BANK_CATALOG.map((bank) => ({
  label: bank.name,
  value: bank.code,
}));

export function CreateCardForm({
  card,
  onDone,
}: {
  card?: Card;
  onDone: () => void;
}) {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const { control, handleSubmit } = useForm<CardInput>({
    resolver: zodResolver(cardSchema),
    mode: 'onTouched',
    defaultValues: {
      name: card?.name ?? '',
      bankCode: card?.bankCode ?? '',
      limit: card?.limit ?? 0,
      closingDay: card ? String(card.closingDay) : '',
      dueDay: card ? String(card.dueDay) : '',
    },
  });

  const mutation = useMutation({
    mutationFn: (input: CardInput) => {
      const payload = {
        name: input.name,
        bankCode: input.bankCode,
        limit: input.limit,
        closingDay: Number(input.closingDay),
        dueDay: Number(input.dueDay),
      };
      return card
        ? cardsApi.update(workspaceId!, card.id, payload)
        : cardsApi.create(workspaceId!, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', workspaceId] });
      onDone();
    },
  });

  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="name"
        label="Nome"
        placeholder="Ex.: Nubank Ultravioleta"
      />
      <SelectField
        control={control}
        name="bankCode"
        label="Banco"
        placeholder="Selecione o banco"
        options={BANK_OPTIONS}
      />
      <MoneyField control={control} name="limit" label="Limite" />
      <SelectField
        control={control}
        name="closingDay"
        label="Dia de fechamento"
        placeholder="Selecione o dia"
        options={DAY_OPTIONS}
      />
      <SelectField
        control={control}
        name="dueDay"
        label="Dia de vencimento"
        placeholder="Selecione o dia"
        options={DAY_OPTIONS}
      />
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
        {card ? 'Salvar alterações' : 'Adicionar cartão'}
      </Button>
    </View>
  );
}
