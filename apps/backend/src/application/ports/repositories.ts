import type { UserRepository } from "./user-repository";
import type { TokenRepository } from "./token-repository";
import type { WorkspaceRepository } from "./workspace-repository";
import type { WorkspaceInviteRepository } from "./workspace-invite-repository";
import type { CategoryRepository } from "./category-repository";
import type { BankRepository } from "./bank-repository";
import type { AccountRepository } from "./account-repository";
import type { CardRepository } from "./card-repository";
import type { InvoiceRepository } from "./invoice-repository";
import type { TransactionRepository } from "./transaction-repository";
import type { RecurringRepository } from "./recurring-repository";
import type { AuditRecorder } from "./audit-recorder";
import type { NotificationRepository } from "./notification-repository";
import type { NotificationPreferenceRepository } from "./notification-preference-repository";
import type { PushTokenRepository } from "./push-token-repository";
import type { WhatsAppLinkCodeRepository } from "./whatsapp-link-code-repository";

/** Conjunto completo de repositórios — fora e dentro do Unit of Work. */
export interface Repositories {
  user: UserRepository;
  token: TokenRepository;
  workspace: WorkspaceRepository;
  invite: WorkspaceInviteRepository;
  category: CategoryRepository;
  bank: BankRepository;
  account: AccountRepository;
  card: CardRepository;
  invoice: InvoiceRepository;
  transaction: TransactionRepository;
  recurring: RecurringRepository;
  audit: AuditRecorder;
  notification: NotificationRepository;
  notificationPreference: NotificationPreferenceRepository;
  pushToken: PushTokenRepository;
  whatsappLinkCode: WhatsAppLinkCodeRepository;
}
