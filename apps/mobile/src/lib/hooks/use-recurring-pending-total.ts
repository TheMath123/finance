import { useQuery } from '@tanstack/react-query';

import { recurringApi } from '@/lib/recurring-api';

export interface RecurringPendingTotal {
  income: number;
  expense: number;
  count: number;
}

/**
 * Soma das recorrências ainda não confirmadas do mês corrente — usado no card
 * da Home e no menu de gerenciar recorrências (explore.tsx). Mesma queryKey
 * dos dois lugares: compartilha cache e invalidação (confirmar/excluir
 * recorrência já invalida os dois de uma vez).
 */
export function useRecurringPendingTotal(
  workspaceId: string | null
): RecurringPendingTotal | null {
  const now = new Date();
  const { data } = useQuery({
    queryKey: [
      'recurring-pending',
      workspaceId,
      now.getFullYear(),
      now.getMonth() + 1,
    ],
    queryFn: () =>
      recurringApi.listPending(
        workspaceId!,
        now.getFullYear(),
        now.getMonth() + 1
      ),
    enabled: Boolean(workspaceId),
  });

  if (!data) return null;
  return data.reduce<RecurringPendingTotal>(
    (acc, occurrence) => {
      if (occurrence.type === 'income') acc.income += occurrence.amount;
      else acc.expense += occurrence.amount;
      acc.count += 1;
      return acc;
    },
    { income: 0, expense: 0, count: 0 }
  );
}
