import type { Bank } from "../../domain/entities/bank";

export interface BankRepository {
  create(workspaceId: string, data: { name: string; bankCode: string }): Promise<Bank>;
  findInWorkspace(workspaceId: string, bankId: string): Promise<Bank | undefined>;
  findByCode(workspaceId: string, bankCode: string): Promise<Bank | undefined>;
  listByWorkspace(workspaceId: string): Promise<Bank[]>;
  update(bankId: string, patch: { name?: string; bankCode?: string }): Promise<Bank>;
  setArchived(bankId: string, archived: boolean): Promise<Bank>;
  delete(bankId: string): Promise<void>;
}
