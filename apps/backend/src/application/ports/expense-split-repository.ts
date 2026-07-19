import type { ExpenseSplit } from "../../domain/entities/expense-split";

export interface CreateExpenseSplitData {
  transactionId: string;
  createdBy: string;
}

export interface ExpenseSplitRepository {
  create(data: CreateExpenseSplitData): Promise<ExpenseSplit>;
  findById(id: string): Promise<ExpenseSplit | undefined>;
  /** No máximo um split ativo (não cancelado) por transação. */
  findActiveByTransaction(transactionId: string): Promise<ExpenseSplit | undefined>;
  /** Condicional (`WHERE cancelled_at IS NULL`) — `undefined` se já estava cancelado (idempotência). */
  cancel(id: string): Promise<ExpenseSplit | undefined>;
}
