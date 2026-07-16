import { mailer } from "@finance/email";
import type { JobHandlers } from "@finance/queues";
import { sendExpoPush } from "../infra/push/expo-push";

/** Handlers dos jobs — compartilhados entre o composition root (enfileira) e o worker (consome). */
export const jobHandlers: JobHandlers = {
  "email.password-reset": (p) => mailer.sendPasswordReset(p),
  "email.verify-email": (p) => mailer.sendEmailVerification(p),
  "email.password-changed": (p) => mailer.sendPasswordChanged(p),
  "email.account-locked": (p) => mailer.sendAccountLocked(p),
  "email.workspace-invite": (p) => mailer.sendWorkspaceInvite(p),
  "push.send": (p) => sendExpoPush(p.tokens, p.title, p.body, p.data),
};
