import { z } from "zod";

/**
 * Fragmento de schema do storage — composto no env.ts do app consumidor
 * (mesmo padrão de eco-system-sales: o pacote só exporta o `schema`, quem
 * valida de verdade no boot é o processo que importa). Nomes genéricos
 * (`STORAGE_*`, nunca `R2_*`/`AWS_*`) pra trocar de provedor S3-compatible
 * no futuro sem mudar código, só valor de env.
 */
const isProduction = process.env.NODE_ENV === "production";
/** Sufixo de ambiente no nome do bucket — separa upload de dev/teste do de produção sem precisar de dois buckets configurados à mão (mesmo padrão de eco-system-sales). */
const bucketSuffix = isProduction ? "" : "-dev";

export const storageEnvSchema = z.object({
  /** Nome padrão do projeto — só sobrescreve se precisar de um bucket diferente (ex.: múltiplos ambientes de staging). */
  STORAGE_BUCKET: z.string().min(1).default(`finance-storage${bucketSuffix}`),
  /** R2 ignora o valor da região — default "auto" cobre esse caso. Só importa de verdade num provedor que exija região real (ex.: AWS S3). */
  STORAGE_REGION: z.string().min(1).default("auto"),
  STORAGE_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
  /** Domínio do provedor S3-compatible (ex.: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` no R2). Vazio = endpoint padrão da AWS. */
  STORAGE_ENDPOINT: z.string().min(1).optional(),
  /** Provedores que não suportam virtual-hosted-style precisam `true`; R2 funciona com `false`. */
  STORAGE_FORCE_PATH_STYLE: z.coerce.boolean().default(false),
});

export type StorageEnv = z.infer<typeof storageEnvSchema>;
