import type { TrustedContact } from '../../domain/entities/inter-user-transfer';

export interface TrustedContactRepository {
  findByPair(
    userId: string,
    trustedUserId: string
  ): Promise<TrustedContact | undefined>;
  listByUser(userId: string): Promise<TrustedContact[]>;
  /** Marca/atualiza — único por (userId, trustedUserId); refaz com conta nova se já existia. */
  upsert(
    userId: string,
    trustedUserId: string,
    defaultAccountId: string
  ): Promise<TrustedContact>;
  /** Escopado ao dono (userId) — nunca remove confiança de outra pessoa. */
  delete(id: string, userId: string): Promise<void>;
}
