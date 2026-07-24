import { z } from 'zod';

/** Envs de e-mail (Resend via SMTP), validadas no primeiro uso do transport. */
const envSchema = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  MAIL_FROM: z.string().min(1),
});

export type EmailEnv = z.infer<typeof envSchema>;

export function loadEmailEnv(): EmailEnv {
  return envSchema.parse(process.env);
}
