import type { Repositories } from '../../../application/ports/repositories';
import type { DbHandle } from '../handle';
import { createAccountRepository } from './account.repository';
import { createAdminAuditRecorder } from './admin-audit.repository';
import { createAuditRecorder } from './audit.repository';
import { createBankRepository } from './bank.repository';
import { createCardRepository } from './card.repository';
import { createCategoryRepository } from './category.repository';
import { createDefaultCategoryRepository } from './default-category.repository';
import { createExpenseSplitRepository } from './expense-split.repository';
import { createInterUserTransferRepository } from './inter-user-transfer.repository';
import { createInvoiceRepository } from './invoice.repository';
import { createNotificationRepository } from './notification.repository';
import { createNotificationPreferenceRepository } from './notification-preference.repository';
import { createPushTokenRepository } from './push-token.repository';
import { createRecurringRepository } from './recurring.repository';
import { createSplitShareRepository } from './split-share.repository';
import { createTokenRepository } from './token.repository';
import { createTransactionRepository } from './transaction.repository';
import { createTrustedContactRepository } from './trusted-contact.repository';
import { createUserRepository } from './user.repository';
import { createWhatsAppLinkCodeRepository } from './whatsapp-link-code.repository';
import { createWorkspaceRepository } from './workspace.repository';
import { createWorkspaceInviteRepository } from './workspace-invite.repository';

/** Fábrica única: mesmo conjunto para o client raiz e para a transação (UoW). */
export function createRepositories(db: DbHandle): Repositories {
  return {
    user: createUserRepository(db),
    token: createTokenRepository(db),
    workspace: createWorkspaceRepository(db),
    invite: createWorkspaceInviteRepository(db),
    category: createCategoryRepository(db),
    defaultCategory: createDefaultCategoryRepository(db),
    bank: createBankRepository(db),
    account: createAccountRepository(db),
    card: createCardRepository(db),
    invoice: createInvoiceRepository(db),
    transaction: createTransactionRepository(db),
    recurring: createRecurringRepository(db),
    audit: createAuditRecorder(db),
    adminAudit: createAdminAuditRecorder(db),
    notification: createNotificationRepository(db),
    notificationPreference: createNotificationPreferenceRepository(db),
    pushToken: createPushTokenRepository(db),
    whatsappLinkCode: createWhatsAppLinkCodeRepository(db),
    interUserTransfer: createInterUserTransferRepository(db),
    trustedContact: createTrustedContactRepository(db),
    expenseSplit: createExpenseSplitRepository(db),
    splitShare: createSplitShareRepository(db),
  };
}
