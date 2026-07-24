import {
  type Either,
  getBank,
  isValidBankCode,
  left,
  right,
} from '@finance/shared';
import type { Bank } from '../../../domain/entities/bank';
import type { Repositories } from '../../ports/repositories';

export type FindOrCreateBankError = 'invalid_bank_code';

/**
 * Usuário não cadastra banco manualmente (spec: escolher um do catálogo já basta,
 * "Outro" cobre o resto) — contas e cartões recebem `bankCode` e o banco é
 * resolvido/criado por trás, dentro da mesma transação da operação chamadora.
 */
export async function findOrCreateBank(
  repos: Repositories,
  workspaceId: string,
  bankCode: string
): Promise<Either<FindOrCreateBankError, Bank>> {
  if (!isValidBankCode(bankCode)) return left('invalid_bank_code');

  const existing = await repos.bank.findByCode(workspaceId, bankCode);
  if (existing) return right(existing);

  const catalog = getBank(bankCode);
  const created = await repos.bank.create(workspaceId, {
    name: catalog!.name,
    bankCode,
  });
  return right(created);
}
