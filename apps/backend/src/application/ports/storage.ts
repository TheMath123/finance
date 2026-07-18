/**
 * Storage de arquivos (M3-01) — S3-compatible (AWS S3 hoje, Cloudflare R2
 * previsto mais pra frente; mesma API nos dois). `key` é o caminho dentro
 * do bucket, nunca a URL final — leitura sempre via URL assinada
 * temporária, o bucket em si nunca é público.
 */
export interface Storage {
  upload(key: string, body: Uint8Array, contentType: string): Promise<void>;
  getSignedReadUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}
