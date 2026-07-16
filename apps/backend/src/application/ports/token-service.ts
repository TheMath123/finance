export interface OpaqueToken {
  raw: string;
  hash: string;
}

export interface TokenService {
  /** JWT de acesso (15 min). */
  signAccess(userId: string): Promise<string>;
  verifyAccess(token: string): Promise<{ userId: string } | null>;
  /** Token opaco (refresh/verificação de e-mail): random 256-bit + hash SHA-256. */
  generateOpaque(): OpaqueToken;
  /** Código numérico de 6 dígitos (reset de senha — curto o bastante pro usuário digitar). */
  generateCode(): OpaqueToken;
  hashOpaque(raw: string): string;
}
