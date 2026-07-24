import { type Either, isValidBankCode, left, right } from '@finance/shared';
import type { Bank } from '../../../domain/entities/bank';
import type { Actor, UseCaseDeps } from '../../deps';
import type { BankError } from './errors';

export interface CreateBankInput {
  name: string;
  bankCode: string;
}

export async function createBank(
  deps: UseCaseDeps,
  actor: Actor,
  input: CreateBankInput
): Promise<Either<BankError, Bank>> {
  if (!isValidBankCode(input.bankCode)) return left('invalid_bank_code');

  const created = await deps.uow.run(async (repos) => {
    const bank = await repos.bank.create(actor.workspaceId, input);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: 'create',
      entity: 'bank',
      entityId: bank.id,
    });
    return bank;
  });
  return right(created);
}
