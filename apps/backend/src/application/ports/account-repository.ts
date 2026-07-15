import type { AccountType } from "@finance/shared";
import type { BankAccount } from "../../domain/entities/bank-account";

export interface CreateAccountData {
  name: string;
  bankId: string;
  type: AccountType;
  initialBalance: number;
}

export interface AccountRepository {
  create(workspaceId: string, data: CreateAccountData): Promise<BankAccount>;
  findInWorkspace(workspaceId: string, accountId: string): Promise<BankAccount | undefined>;
  /** Não arquivada (formulários de lançamento). */
  findActiveInWorkspace(workspaceId: string, accountId: string): Promise<BankAccount | undefined>;
  listByWorkspace(workspaceId: string): Promise<BankAccount[]>;
  update(accountId: string, patch: Partial<CreateAccountData>): Promise<BankAccount>;
  setArchived(accountId: string, archived: boolean): Promise<BankAccount>;
  delete(accountId: string): Promise<void>;
  existsByBank(bankId: string): Promise<boolean>;
}
