import type { TransactionMethod } from '@finance/shared';
import { type Either, left, right } from '@finance/shared';
import type { Transaction } from '../../../domain/entities/transaction';
import { normalizeDescription } from '../../../domain/services/occurrence-rules';
import type { Actor, UseCaseDeps } from '../../deps';
import type { AccountError } from './errors';

export interface ConfirmAccountCsvImportRowInput {
  /** Data já parseada (YYYY-MM-DD) da linha original do CSV. */
  date: string;
  /** Sem o sufixo "NN/NN" — o preview já devolve limpa. */
  description: string;
  /** Centavos, com sinal — extrato: positivo = entrada, negativo = saída, igual ao preview. */
  amount: number;
  categoryId: string;
}

export interface ConfirmAccountCsvImportInput {
  accountId: string;
  /** Único pro lote inteiro — extrato de conta não distingue método por linha. */
  method: Extract<TransactionMethod, 'pix' | 'debit' | 'cash'>;
  rows: ConfirmAccountCsvImportRowInput[];
}

export interface ConfirmAccountCsvImportOutput {
  created: number;
  skippedDuplicates: number;
}

/**
 * Grava o lote confirmado pelo usuário. Sem fatura/parcela — cada linha vira
 * uma transação avulsa na conta, com `method` fixo escolhido pro lote. Dedup
 * (data+descrição normalizada+valor absoluto) roda de novo aqui — nunca
 * confia cegamente na classificação do preview, que pode ter ficado
 * desatualizada entre as duas chamadas.
 */
export async function confirmAccountCsvImport(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  actor: Actor,
  input: ConfirmAccountCsvImportInput
): Promise<Either<AccountError, ConfirmAccountCsvImportOutput>> {
  const account = await deps.repos.account.findActiveInWorkspace(
    actor.workspaceId,
    input.accountId
  );
  if (!account) return left('account_not_found');
  const accountId = account.id;

  const categoryIds = [...new Set(input.rows.map((r) => r.categoryId))];
  for (const categoryId of categoryIds) {
    const category = await deps.repos.category.findInWorkspace(
      actor.workspaceId,
      categoryId
    );
    if (!category) return left('category_not_found');
  }

  const dates = input.rows.map((r) => r.date);
  const from = dates.reduce((min, d) => (d < min ? d : min));
  const to = dates.reduce((max, d) => (d > max ? d : max));

  let created = 0;
  let skippedDuplicates = 0;

  await deps.uow.run(async (repos) => {
    const existing: Transaction[] =
      await repos.transaction.listByAccountAndPeriod(accountId, from, to);

    for (const row of input.rows) {
      const descriptionNormalized = normalizeDescription(row.description);
      const type = row.amount < 0 ? 'expense' : 'income';
      const absoluteAmount = Math.abs(row.amount);

      const isDuplicate = existing.some(
        (t) =>
          t.date === row.date &&
          t.descriptionNormalized === descriptionNormalized &&
          t.amount === absoluteAmount
      );
      if (isDuplicate) {
        skippedDuplicates++;
        continue;
      }

      const createdRow = await repos.transaction.create({
        workspaceId: actor.workspaceId,
        createdBy: actor.userId,
        description: row.description,
        descriptionNormalized,
        amount: absoluteAmount,
        type,
        method: input.method,
        date: row.date,
        categoryId: row.categoryId,
        accountId,
        source: 'app',
      });
      // Mantém o cache coerente pra próxima iteração — duas linhas do lote
      // podem ter a mesma combinação (ex. dois lançamentos idênticos no mesmo dia).
      existing.push(createdRow);

      await repos.audit.record({
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        action: 'create',
        entity: 'transaction',
        entityId: createdRow.id,
      });

      created++;
    }
  });

  return right({ created, skippedDuplicates });
}
