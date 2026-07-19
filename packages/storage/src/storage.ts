/**
 * Storage de arquivos (M3-01) — S3-compatible (Cloudflare R2 hoje, qualquer
 * outro provedor que fale a API do S3 amanhã). `key` é o caminho dentro do
 * bucket, nunca a URL final — leitura sempre via URL assinada temporária, o
 * bucket em si nunca é público.
 */
export interface Storage {
  upload(key: string, body: Uint8Array, contentType: string): Promise<void>;
  getSignedReadUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}
