import type {
  TransactionMethod,
  TransactionSource,
  TransactionType,
} from '@finance/shared';
import { type Either, left, right } from '@finance/shared';
import type { Transaction } from '../../../domain/entities/transaction';
import {
  addMonths,
  addMonthsToDate,
  competencePeriod,
  splitInstallments,
} from '../../../domain/services/invoice-rules';
import { normalizeDescription } from '../../../domain/services/occurrence-rules';
import type { Actor, UseCaseDeps } from '../../deps';
import type { TransactionError } from './errors';

/**
 * Auditoria de segurança (2026-07-19): sinaliza dentro do `uow.run` que uma
 * fatura futura já está paga — precisa ser `throw` (não `return`), porque um
 * retorno normal de dentro de `db.transaction()` **comita** o que já foi
 * inserido no loop (parcelas 0..i-1), mesmo a use-case reportando erro.
 */
class InvoicePaidError extends Error {}

export interface CreateTransactionInput {
  description: string;
  amount: number;
  type: TransactionType;
  method: TransactionMethod;
  date: string; // YYYY-MM-DD (competência, America/Sao_Paulo)
  categoryId: string;
  accountId?: string;
  toAccountId?: string;
  cardId?: string;
  /** Apenas method=credit; 1 = à vista. */
  installments?: number;
  /** Preenchido quando a transação materializa uma recorrência confirmada. */
  recurringId?: string;
  /** Canal de origem (spec: camada de service canal-agnóstica) — default "app". */
  source?: TransactionSource;
}

export async function createTransaction(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  actor: Actor,
  input: CreateTransactionInput
): Promise<Either<TransactionError, Transaction[]>> {
  const category = await deps.repos.category.findInWorkspace(
    actor.workspaceId,
    input.categoryId
  );
  if (!category) return left('category_not_found');

  const base = {
    workspaceId: actor.workspaceId,
    createdBy: actor.userId,
    description: input.description,
    descriptionNormalized: normalizeDescription(input.description),
    type: input.type,
    method: input.method,
    date: input.date,
    categoryId: input.categoryId,
    recurringId: input.recurringId ?? null,
    source: input.source ?? 'app',
  };

  // Transferência: conta origem + destino, neutra (convenção: type=expense)
  if (input.method === 'transfer') {
    if (
      !input.accountId ||
      !input.toAccountId ||
      input.accountId === input.toAccountId
    ) {
      return left('invalid_method_fields');
    }
    const [from, to] = await Promise.all([
      deps.repos.account.findActiveInWorkspace(
        actor.workspaceId,
        input.accountId
      ),
      deps.repos.account.findActiveInWorkspace(
        actor.workspaceId,
        input.toAccountId
      ),
    ]);
    if (!from || !to) return left('account_not_found');

    const created = await deps.uow.run(async (repos) => {
      const row = await repos.transaction.create({
        ...base,
        type: 'expense',
        amount: input.amount,
        accountId: input.accountId,
        toAccountId: input.toAccountId,
      });
      await repos.audit.record({
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        action: 'create',
        entity: 'transaction',
        entityId: row.id,
      });
      return [row];
    });
    return right(created);
  }

  // Crédito: cartão + fatura lazy por competência; parcelas em faturas consecutivas
  if (input.method === 'credit') {
    if (!input.cardId || input.accountId || input.toAccountId) {
      return left('invalid_method_fields');
    }
    const card = await deps.repos.card.findActiveInWorkspace(
      actor.workspaceId,
      input.cardId
    );
    if (!card) return left('card_not_found');

    const count = input.installments ?? 1;
    const amounts = splitInstallments(input.amount, count);
    let firstPeriod = competencePeriod(input.date, card.closingDay);
    // Fatura paga é imutável (regra do spec) — se a competência calculada pela
    // data da compra cair numa fatura já paga, rola pra frente até achar uma
    // em aberto. É o que acontece de verdade com um cartão: uma cobrança que
    // chega depois da fatura já fechada/paga entra na fatura seguinte, nunca
    // fica travada tentando "voltar no tempo" pra uma fatura já quitada.
    // Guard de 24 meses só por segurança (nunca deveria ter 24 faturas
    // seguidas pagas com antecedência).
    for (let guard = 0; guard < 24; guard++) {
      const existing = await deps.repos.invoice.findByCardAndPeriod(
        card.id,
        firstPeriod
      );
      if (!existing || existing.status !== 'paid') break;
      firstPeriod = addMonths(firstPeriod, 1);
    }
    const groupId = count > 1 ? crypto.randomUUID() : null;

    try {
      const rows = await deps.uow.run(async (repos) => {
        const created: Transaction[] = [];
        for (let i = 0; i < count; i++) {
          const invoice = await repos.invoice.getOrCreate(
            actor.workspaceId,
            card.id,
            addMonths(firstPeriod, i)
          );
          if (invoice.status === 'paid') throw new InvoicePaidError();
          const row = await repos.transaction.create({
            ...base,
            // Cada parcela é datada na sua própria competência, não na data da
            // compra original — senão a 2ª/3ª/4ª parcela nunca aparecia no mês
            // certo (resumo mensal, filtro por período).
            date: addMonthsToDate(input.date, i),
            amount: amounts[i]!,
            cardId: card.id,
            invoiceId: invoice.id,
            installmentNumber: count > 1 ? i + 1 : null,
            installmentTotal: count > 1 ? count : null,
            installmentGroupId: groupId,
          });
          await repos.audit.record({
            workspaceId: actor.workspaceId,
            userId: actor.userId,
            action: 'create',
            entity: 'transaction',
            entityId: row.id,
          });
          created.push(row);
        }
        return created;
      });
      return right(rows);
    } catch (error) {
      if (error instanceof InvoicePaidError) return left('invoice_paid');
      throw error;
    }
  }

  // Demais métodos (pix/debit/cash): conta obrigatória
  if (!input.accountId || input.cardId || input.toAccountId) {
    return left('invalid_method_fields');
  }
  const account = await deps.repos.account.findActiveInWorkspace(
    actor.workspaceId,
    input.accountId
  );
  if (!account) return left('account_not_found');

  const created = await deps.uow.run(async (repos) => {
    const row = await repos.transaction.create({
      ...base,
      amount: input.amount,
      accountId: input.accountId,
    });
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: 'create',
      entity: 'transaction',
      entityId: row.id,
    });
    return [row];
  });
  return right(created);
}
