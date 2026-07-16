import { z } from "zod";

/** Envs do backend, validadas no boot (regra: toda env nova entra aqui E no .env.example). */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_SECRET: z.string().min(32, "JWT_SECRET precisa ter ao menos 32 caracteres"),
  TERMS_VERSION: z.string().min(1).default("2026-07-13"),
  /** true apenas atrás do proxy do provedor (X-Forwarded-For confiável). */
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  return envSchema.parse(process.env);
}
