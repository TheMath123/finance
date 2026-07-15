export interface OpaqueToken {
  raw: string;
  hash: string;
}

export interface TokenService {
  /** JWT de acesso (15 min). */
  signAccess(userId: string): Promise<string>;
  verifyAccess(token: string): Promise<{ userId: string } | null>;
  /** Token opaco (refresh/reset/verificação): random 256-bit + hash SHA-256. */
  generateOpaque(): OpaqueToken;
  hashOpaque(raw: string): string;
}
