/**
 * Tipos dos jobs — o contrato existe desde o M1 (spec: packages/queues).
 * Novos jobs (webhook do WhatsApp, auto-lançamento de recorrência, push) entram aqui no M2.
 */
export interface JobPayloads {
  'email.password-reset': { to: string; name: string; code: string };
  'email.verify-email': { to: string; name: string; code: string };
  'email.password-changed': { to: string; name: string };
  /** Prova de posse do e-mail novo, na troca de e-mail do perfil (mesmo padrão do reset por código). */
  'email.confirm-email-change': { to: string; name: string; code: string };
  /** Aviso de segurança pro e-mail ANTIGO, depois que a troca é confirmada. */
  'email.email-changed': { to: string; name: string; newEmail: string };
  /** Código de 6 dígitos pra autorizar a exclusão da conta (perfil), enviado pro próprio e-mail cadastrado. */
  'email.confirm-account-deletion': { to: string; name: string; code: string };
  'email.account-locked': { to: string; name: string; minutes: number };
  /** Sem link (mesmo motivo do reset por código: clientes de e-mail removem <a href> com esquema custom) — o convite é aceito na tela "Convites" do app. */
  'email.workspace-invite': {
    to: string;
    inviterName: string;
    workspaceName: string;
  };
  /**
   * Um ou mais tokens do Expo Push Service (mesmo usuário pode ter vários devices).
   * `categoryId` liga a notificação numa categoria de ação rápida já registrada
   * no device (`Notifications.setNotificationCategoryAsync`) — recusar
   * transferência, marcar/confirmar split direto na notificação, sem abrir o app.
   */
  'push.send': {
    tokens: string[];
    title: string;
    body: string;
    data?: Record<string, unknown>;
    categoryId?: string;
  };
  /** Mensagem de texto recebida no webhook do WhatsApp (M2-06) — processamento tirado do handler síncrono. */
  'whatsapp.inbound-message': { from: string; text: string };
  /** Foto recebida no webhook do WhatsApp (M3-05) — vira comprovante da última transação do remetente. */
  'whatsapp.inbound-image': { from: string; mediaId: string; mimeType: string };
}

export type JobName = keyof JobPayloads;

export type JobHandlers = {
  [N in JobName]: (payload: JobPayloads[N]) => Promise<void>;
};
