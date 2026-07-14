/**
 * Funções de envio por caso de uso — nenhum app monta e-mail manualmente (spec).
 * `mailer` é a interface consumida pelos services (fácil de trocar por fake em teste).
 */
import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { getTransport } from "./transport";
import { PasswordResetEmail } from "./templates/password-reset";
import { VerifyEmailEmail } from "./templates/verify-email";
import { PasswordChangedEmail } from "./templates/password-changed";
import { WorkspaceInviteEmail } from "./templates/workspace-invite";

async function send(to: string, subject: string, element: ReactElement): Promise<void> {
  const { transporter, env } = getTransport();
  const html = await render(element);
  await transporter.sendMail({ from: env.MAIL_FROM, to, subject, html });
}

export interface Mailer {
  sendPasswordReset(input: { to: string; name: string; resetUrl: string }): Promise<void>;
  sendEmailVerification(input: { to: string; name: string; verifyUrl: string }): Promise<void>;
  sendPasswordChanged(input: { to: string; name: string }): Promise<void>;
  sendWorkspaceInvite(input: {
    to: string;
    inviterName: string;
    workspaceName: string;
    acceptUrl: string;
  }): Promise<void>;
}

export const mailer: Mailer = {
  sendPasswordReset: ({ to, name, resetUrl }) =>
    send(to, "Redefinição de senha", PasswordResetEmail({ name, resetUrl })),
  sendEmailVerification: ({ to, name, verifyUrl }) =>
    send(to, "Confirme seu e-mail", VerifyEmailEmail({ name, verifyUrl })),
  sendPasswordChanged: ({ to, name }) =>
    send(to, "Sua senha foi alterada", PasswordChangedEmail({ name })),
  sendWorkspaceInvite: ({ to, inviterName, workspaceName, acceptUrl }) =>
    send(
      to,
      `Convite para o workspace ${workspaceName}`,
      WorkspaceInviteEmail({ inviterName, workspaceName, acceptUrl }),
    ),
};
