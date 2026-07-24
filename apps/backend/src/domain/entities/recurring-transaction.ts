import type {
  RecurrenceFrequency,
  TransactionMethod,
  TransactionType,
} from '@finance/shared';

export interface RecurringTransaction {
  id: string;
  workspaceId: string;
  description: string;
  /** Centavos. */
  amount: number;
  type: TransactionType;
  method: TransactionMethod;
  categoryId: string;
  accountId: string | null;
  cardId: string | null;
  frequency: RecurrenceFrequency;
  /** Dia do mês (monthly/yearly) ou da semana em JS 0-6 (weekly). */
  dayOfReference: number;
  /** Apenas yearly: mês 1-12. */
  monthOfReference: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
