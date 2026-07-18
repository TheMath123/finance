import { z } from "zod";

/**
 * Env do storage de arquivos (M3-01), validada no primeiro uso — mesmo
 * padrão de infra/ai e infra/whatsapp. Nomes genéricos de propósito: hoje
 * aponta pra AWS S3, mas fala a mesma API que Cloudflare R2 — a troca
 * futura é só valor de env (STORAGE_ENDPOINT + STORAGE_FORCE_PATH_STYLE),
 * sem mudar nada de código.
 */
const envSchema = z.object({
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_REGION: z.string().min(1),
  STORAGE_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
  /** Só pra provedores S3-compatible que não sejam a AWS de verdade (ex.: R2). Vazio = endpoint padrão da AWS. */
  STORAGE_ENDPOINT: z.string().min(1).optional(),
  /** R2 e outros provedores S3-compatible geralmente exigem path-style; AWS S3 real não precisa. */
  STORAGE_FORCE_PATH_STYLE: z.coerce.boolean().default(false),
});

export type StorageEnv = z.infer<typeof envSchema>;

export function loadStorageEnv(): StorageEnv {
  return envSchema.parse(process.env);
}
