import type { RecurrenceFrequency, TransactionType } from "@finance/shared";

import { apiRequest } from "@/lib/api-client";

/** Método de recorrência — transferência recorrente fica fora do M1 (sem conta destino). */
export type RecurringMethod = "pix" | "debit" | "cash" | "credit";

export interface RecurringTransaction {
  id: string;
  workspaceId: string;
  description: string;
  /** Centavos. */
  amount: number;
  type: TransactionType;
  method: RecurringMethod;
  categoryId: string;
  accountId: string | null;
  cardId: string | null;
  frequency: RecurrenceFrequency;
  /** Dia do mês (1-31) pra monthly/yearly, ou dia da semana 0-6 (domingo=0) pra weekly. */
  dayOfReference: number;
  /** Só usado se frequency="yearly" (1-12). */
  monthOfReference: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringInput {
  description: string;
  /** Centavos. */
  amount: number;
  type: TransactionType;
  method: RecurringMethod;
  categoryId: string;
  accountId?: string;
  cardId?: string;
  frequency: RecurrenceFrequency;
  dayOfReference: number;
  monthOfReference?: number;
  active?: boolean;
}

/** PATCH parcial — a API aceita partial de CreateRecurringInput, e ainda o toggle `active`. */
export type UpdateRecurringInput = Partial<CreateRecurringInput>;

export interface PendingOccurrence {
  recurringId: string;
  /** YYYY-MM-DD. */
  date: string;
  description: string;
  /** Centavos. */
  amount: number;
  type: TransactionType;
  method: RecurringMethod;
  categoryId: string;
  accountId: string | null;
  cardId: string | null;
}

export const recurringApi = {
  list: (workspaceId: string) =>
    apiRequest<RecurringTransaction[]>(`/workspaces/${workspaceId}/recurring`),

  create: (workspaceId: string, input: CreateRecurringInput) =>
    apiRequest<RecurringTransaction>(`/workspaces/${workspaceId}/recurring`, {
      method: "POST",
      body: input,
    }),

  listPending: (workspaceId: string, year: number, month: number) =>
    apiRequest<PendingOccurrence[]>(
      `/workspaces/${workspaceId}/recurring/pending?year=${year}&month=${month}`,
    ),

  confirmOccurrence: (workspaceId: string, recurringId: string, date: string) =>
    apiRequest(`/workspaces/${workspaceId}/recurring/${recurringId}/confirm`, {
      method: "POST",
      body: { date },
    }),

  update: (workspaceId: string, recurringId: string, input: UpdateRecurringInput) =>
    apiRequest<RecurringTransaction>(`/workspaces/${workspaceId}/recurring/${recurringId}`, {
      method: "PATCH",
      body: input,
    }),

  delete: (workspaceId: string, recurringId: string) =>
    apiRequest<void>(`/workspaces/${workspaceId}/recurring/${recurringId}`, {
      method: "DELETE",
    }),
};
