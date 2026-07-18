import type { TransactionMethod, TransactionSource, TransactionType } from "@finance/shared";
import type { Transaction } from "../../domain/entities/transaction";
import type { TransactionExportRow } from "../../domain/services/transactions-csv";

/** Dados para inserção (id/timestamps são da infra). */
export interface TransactionDraft {
  workspaceId: string;
  createdBy: string;
  description: string;
  descriptionNormalized: string;
  amount: number;
  type: TransactionType;
  method: TransactionMethod;
  date: string;
  categoryId: string;
  accountId?: string | null;
  toAccountId?: string | null;
  cardId?: string | null;
  invoiceId?: string | null;
  installmentNumber?: number | null;
  installmentTotal?: number | null;
  installmentGroupId?: string | null;
  recurringId?: string | null;
  source?: TransactionSource;
}

export interface TransactionPatch {
  description?: string;
  descriptionNormalized?: string;
  amount?: number;
  categoryId?: string;
  date?: string;
  invoiceId?: string;
}

export interface TransactionFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  accountId?: string;
  cardId?: string;
  createdBy?: string;
  qNormalized?: string;
  limit?: number;
  offset?: number;
  deletedOnly?: boolean;
}

export interface TransactionRepository {
  create(draft: TransactionDraft): Promise<Transaction>;
  findInWorkspace(workspaceId: string, id: string): Promise<Transaction | undefined>;
  listByGroup(installmentGroupId: string): Promise<Transaction[]>;
  update(id: string, patch: TransactionPatch): Promise<Transaction>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  list(workspaceId: string, filters: TransactionFilters): Promise<Transaction[]>;
  existsByAccount(accountId: string): Promise<boolean>;
  existsByCard(cardId: string): Promise<boolean>;
  findByRecurringAndDate(recurringId: string, date: string): Promise<Transaction | undefined>;
  /** Pares (recurringId, date) já materializados — inclui soft-deletadas (spec). */
  confirmedOccurrenceKeys(recurringIds: string[]): Promise<{ recurringId: string; date: string }[]>;
  /** Σ efeitos na conta (sem o initial_balance) — saldo derivado (spec). */
  balanceDelta(accountId: string): Promise<number>;
  reassignCategory(fromCategoryId: string, toCategoryId: string): Promise<void>;
  /** Cache de categorização (M2-07): categoria mais usada pra essa descrição normalizada, se houver. */
  findMostUsedCategory(workspaceId: string, descriptionNormalized: string): Promise<string | undefined>;
  monthlyTotals(
    workspaceId: string,
    from: string,
    to: string,
  ): Promise<{ income: number; expense: number }>;
  expenseByCategory(
    workspaceId: string,
    from: string,
    to: string,
  ): Promise<{ categoryId: string; name: string; color: string; total: number }[]>;
  /**
   * Igual a `expenseByCategory`, mas só o que é "variável" de verdade —
   * exclui parcelas (`installmentGroupId`) e recorrências (`recurringId`),
   * que já entram no disponível projetado por outro caminho (M2-08).
   */
  variableExpenseByCategory(
    workspaceId: string,
    from: string,
    to: string,
  ): Promise<{ categoryId: string; name: string; color: string; total: number }[]>;
  /** Export CSV (M2-11, LGPD) — todas as transações do workspace, nomes já resolvidos, sem limite de página. */
  listForExport(workspaceId: string): Promise<TransactionExportRow[]>;
}
