import type { AccountType } from "@finance/shared";

export interface BankAccount {
  id: string;
  workspaceId: string;
  bankId: string;
  name: string;
  type: AccountType;
  /** Centavos. Saldo atual é SEMPRE derivado (regra do spec). */
  initialBalance: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
