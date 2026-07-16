import type { AuthToken, AuthTokenPurpose, RefreshToken } from "../../domain/entities/tokens";

export interface TokenRepository {
  createRefresh(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findRefreshByHash(tokenHash: string): Promise<RefreshToken | undefined>;
  deleteRefreshById(id: string): Promise<void>;
  deleteRefreshByHash(tokenHash: string): Promise<void>;
  deleteAllRefreshByUser(userId: string): Promise<void>;

  createAuthToken(data: {
    userId: string;
    purpose: AuthTokenPurpose;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  /** Não usado e não expirado. */
  findValidAuthToken(purpose: AuthTokenPurpose, tokenHash: string): Promise<AuthToken | undefined>;
  /**
   * Igual acima, mas escopado por usuário — obrigatório pro código de reset de senha
   * (6 dígitos): o hash sozinho não é globalmente único, então sem o userId a busca
   * seria um oráculo de força bruta entre usuários diferentes.
   */
  findValidAuthTokenForUser(
    userId: string,
    purpose: AuthTokenPurpose,
    tokenHash: string,
  ): Promise<AuthToken | undefined>;
  markAuthTokenUsed(id: string): Promise<void>;
  deleteUnusedAuthTokens(userId: string, purpose: AuthTokenPurpose): Promise<void>;
}
