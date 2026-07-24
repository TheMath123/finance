import type { RecurrenceFrequency } from '@finance/shared';
import { validateRule as validateRuleShape } from '../../../domain/services/occurrence-rules';
import type { Repositories } from '../../ports/repositories';
import type { CreateRecurringInput } from './create-recurring';
import type { RecurringError } from './errors';

export function validateRule(input: {
  frequency: RecurrenceFrequency;
  dayOfReference: number;
  monthOfReference?: number | null;
}): boolean {
  return validateRuleShape(input);
}

export async function validateRefs(
  repos: Repositories,
  workspaceId: string,
  input: Pick<
    CreateRecurringInput,
    'method' | 'categoryId' | 'accountId' | 'cardId'
  >
): Promise<RecurringError | null> {
  const category = await repos.category.findInWorkspace(
    workspaceId,
    input.categoryId
  );
  if (!category) return 'category_not_found';

  if (input.method === 'credit') {
    if (!input.cardId || input.accountId) return 'invalid_method_fields';
    const card = await repos.card.findInWorkspace(workspaceId, input.cardId);
    if (!card) return 'card_not_found';
  } else {
    if (!input.accountId || input.cardId) return 'invalid_method_fields';
    const account = await repos.account.findInWorkspace(
      workspaceId,
      input.accountId
    );
    if (!account) return 'account_not_found';
  }
  return null;
}
