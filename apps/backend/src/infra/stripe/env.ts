import { z } from 'zod';

/** Envs do Stripe (M5-05), validadas no primeiro uso do client — mesmo padrão de infra/whatsapp e infra/ai. */
const envSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1),
  /** Assina o corpo do webhook (`stripe-signature`) — vem do Dashboard do Stripe (Developers > Webhooks) ou do `stripe listen` local. */
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
});

export type StripeEnv = z.infer<typeof envSchema>;

export function loadStripeEnv(): StripeEnv {
  return envSchema.parse(process.env);
}
