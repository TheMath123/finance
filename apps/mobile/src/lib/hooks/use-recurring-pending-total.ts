import { useQuery } from '@tanstack/react-query';

import { recurringApi } from '@/lib/recurring-api';

export interface RecurringPendingTotal {
  income: number;
  expense: number;
  count: number;
}

/**
 * Soma das recorrências ainda não confirmadas de um mês — usado no card da
 * Home (mês navegável, ver monthCursor em index.tsx) e no menu de gerenciar
 * recorrências (explore.tsx, sempre mês corrente). Mesma queryKey nos dois
 * lugares quando `period` é omitido: compartilha cache e invalidação
 * (confirmar/excluir recorrência já invalida os dois de uma vez).
 */
export function useRecurringPendingTotal(
  workspaceId: string | null,
  period?: { year: number; month: number }
): RecurringPendingTotal | null {
  const now = new Date();
  const year = period?.year ?? now.getFullYear();
  const month = period?.month ?? now.getMonth() + 1;
  const { data } = useQuery({
    queryKey: ['recurring-pending', workspaceId, year, month],
    queryFn: () => recurringApi.listPending(workspaceId!, year, month),
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
