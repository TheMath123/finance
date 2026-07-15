import type { TransactionMethod, TransactionSource, TransactionType } from "@finance/shared";

export interface Transaction {
  id: string;
  workspaceId: string;
  createdBy: string | null;
  description: string;
  descriptionNormalized: string;
  /** Centavos. */
  amount: number;
  type: TransactionType;
  method: TransactionMethod;
  /** Competência local (YYYY-MM-DD). */
  date: string;
  categoryId: string;
  accountId: string | null;
  toAccountId: string | null;
  cardId: string | null;
  invoiceId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  installmentGroupId: string | null;
  recurringId: string | null;
  source: TransactionSource;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
