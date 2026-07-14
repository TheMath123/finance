import nodemailer, { type Transporter } from "nodemailer";
import { loadEmailEnv, type EmailEnv } from "./env";

/**
 * Nodemailer via SMTP: trocar de provedor (Resend → outro) é trocar credenciais,
 * sem mudar código. Transport criado lazy para testes não exigirem SMTP.
 */
let cached: { transporter: Transporter; env: EmailEnv } | null = null;

export function getTransport(): { transporter: Transporter; env: EmailEnv } {
  if (!cached) {
    const env = loadEmailEnv();
    cached = {
      env,
      transporter: nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      }),
    };
  }
  return cached;
}
