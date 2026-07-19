import type { AccountType } from "@finance/shared";
import type { BankAccount } from "../../domain/entities/bank-account";

export interface CreateAccountData {
  name: string;
  bankId: string;
  type: AccountType;
  initialBalance: number;
}

export interface AccountForUser {
  account: BankAccount;
  workspaceId: string;
  workspaceName: string;
}

export interface AccountRepository {
  create(workspaceId: string, data: CreateAccountData): Promise<BankAccount>;
  findInWorkspace(workspaceId: string, accountId: string): Promise<BankAccount | undefined>;
  /** Sem escopo de workspace — só pra uso interno quando o dono já foi validado por outro caminho (ex.: trusted contact, M3-02). Nunca expor via rota sem revalidar propriedade. */
  findById(accountId: string): Promise<BankAccount | undefined>;
  /** Não arquivada (formulários de lançamento). */
  findActiveInWorkspace(workspaceId: string, accountId: string): Promise<BankAccount | undefined>;
  listByWorkspace(workspaceId: string): Promise<BankAccount[]>;
  /** Contas ativas de todos os workspaces em que o usuário é membro — escolha de destino de transferência (M3-02), não escopado a um workspace só. */
  listActiveForUser(userId: string): Promise<AccountForUser[]>;
  update(accountId: string, patch: Partial<CreateAccountData>): Promise<BankAccount>;
  setArchived(accountId: string, archived: boolean): Promise<BankAccount>;
  delete(accountId: string): Promise<void>;
  existsByBank(bankId: string): Promise<boolean>;
}
