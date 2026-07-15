import type { Repositories } from "../../../application/ports/repositories";
import type { DbHandle } from "../handle";
import { createUserRepository } from "./user.repository";
import { createTokenRepository } from "./token.repository";
import { createWorkspaceRepository } from "./workspace.repository";
import { createCategoryRepository } from "./category.repository";
import { createBankRepository } from "./bank.repository";
import { createAccountRepository } from "./account.repository";
import { createCardRepository } from "./card.repository";
import { createInvoiceRepository } from "./invoice.repository";
import { createTransactionRepository } from "./transaction.repository";
import { createRecurringRepository } from "./recurring.repository";
import { createAuditRecorder } from "./audit.repository";

/** Fábrica única: mesmo conjunto para o client raiz e para a transação (UoW). */
export function createRepositories(db: DbHandle): Repositories {
  return {
    user: createUserRepository(db),
    token: createTokenRepository(db),
    workspace: createWorkspaceRepository(db),
    category: createCategoryRepository(db),
    bank: createBankRepository(db),
    account: createAccountRepository(db),
    card: createCardRepository(db),
    invoice: createInvoiceRepository(db),
    transaction: createTransactionRepository(db),
    recurring: createRecurringRepository(db),
    audit: createAuditRecorder(db),
  };
}
