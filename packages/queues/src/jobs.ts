/**
 * Tipos dos jobs — o contrato existe desde o M1 (spec: packages/queues).
 * Novos jobs (webhook do WhatsApp, auto-lançamento de recorrência, push) entram aqui no M2.
 */
export interface JobPayloads {
  "email.password-reset": { to: string; name: string; code: string };
  "email.verify-email": { to: string; name: string; code: string };
  "email.password-changed": { to: string; name: string };
  "email.account-locked": { to: string; name: string; minutes: number };
  /** Sem link (mesmo motivo do reset por código: clientes de e-mail removem <a href> com esquema custom) — o convite é aceito na tela "Convites" do app. */
  "email.workspace-invite": { to: string; inviterName: string; workspaceName: string };
  /** Um ou mais tokens do Expo Push Service (mesmo usuário pode ter vários devices). */
  "push.send": { tokens: string[]; title: string; body: string; data?: Record<string, unknown> };
}

export type JobName = keyof JobPayloads;

export type JobHandlers = {
  [N in JobName]: (payload: JobPayloads[N]) => Promise<void>;
};
