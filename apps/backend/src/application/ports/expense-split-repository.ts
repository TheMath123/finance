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
  cancel(id: string): Promise<ExpenseSplit>;
}
