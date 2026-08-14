import { storageEnvSchema } from '@finance/storage';
import { z } from 'zod';

/**
 * Envs do backend, validadas no boot (regra: toda env nova entra aqui E no
 * .env.example). `storageEnvSchema` vem de `@finance/storage` — composição
 * do fragmento do pacote aqui, mesmo padrão do eco-system-sales (o processo
 * não sobe sem STORAGE_* configurado; diferente do restante das integrações
 * deste backend, que validam a própria env só no primeiro uso — decisão
 * explícita de 2026-07-19 pra alinhar com o padrão do outro monorepo).
 */
const envSchema = z.object({
  ...storageEnvSchema.shape,
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET precisa ter ao menos 32 caracteres'),
  /** Fila (BullMQ) e rate limiter — M2 (spec: Redis entra no M2). */
  REDIS_URL: z.string().url(),
  TERMS_VERSION: z.string().min(1).default('2026-07-13'),
  /** true apenas atrás do proxy do provedor (X-Forwarded-For confiável). */
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  /**
   * Origem permitida no CORS (dashboard web — M4). O dashboard fala com a API
   * só pelo servidor do SvelteKit (server-to-server, sem CORS envolvido), então
   * isto é defesa em profundidade caso alguma rota vire proxy direto no futuro.
   *
   * Também usada pra montar o link de confirmação de e-mail enviado no
   * cadastro (`${DASHBOARD_ORIGIN}/verify-email?token=...` — ver register.ts).
   */
  DASHBOARD_ORIGIN: z.string().url().default('http://localhost:5173'),
  /**
   * Client IDs do Google OAuth aceitos como audience no login social —
   * separados por vírgula. Hoje só o client "Web" (usado pelo dashboard via
   * Google Identity Services); a Fase 2 (mobile) soma os clients iOS/Android
   * nesta mesma variável, sem precisar de env nova (ver google-sign-in.ts).
   *
   * Default vazio (nunca casa nenhuma audience) em vez de obrigatório — sem
   * isso, todo ambiente existente (dev, CI, produção) pararia de subir só
   * por falta dessa env; login com Google simplesmente fica indisponível
   * (`google_token_invalid` sempre) até a env ser configurada de verdade.
   */
  GOOGLE_CLIENT_IDS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    ),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  return envSchema.parse(process.env);
}
