/**
 * Tipos dos jobs — o contrato existe desde o M1 (spec: packages/queues).
 * Novos jobs (webhook do WhatsApp, auto-lançamento de recorrência, push) entram aqui no M2.
 */
export interface JobPayloads {
  "email.password-reset": { to: string; name: string; code: string };
  "email.verify-email": { to: string; name: string; code: string };
  "email.password-changed": { to: string; name: string };
  "email.account-locked": { to: string; name: string; minutes: number };
  "email.workspace-invite": { to: string; inviterName: string; workspaceName: string; acceptUrl: string };
}

export type JobName = keyof JobPayloads;

export type JobHandlers = {
  [N in JobName]: (payload: JobPayloads[N]) => Promise<void>;
};
