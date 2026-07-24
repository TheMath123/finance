import type { Card } from '../../../domain/entities/card';
import type { Actor, UseCaseDeps } from '../../deps';

export interface CardWithLimit extends Card {
  /** limit − Σ(faturas não pagas) — derivado (regra do spec). */
  availableLimit: number;
  /** Código do catálogo do banco — evita o app precisar buscar a lista de bancos à parte. */
  bankCode: string;
}

export async function listCards(
  deps: UseCaseDeps,
  actor: Actor
): Promise<CardWithLimit[]> {
  const [cards, banks] = await Promise.all([
    deps.repos.card.listByWorkspace(actor.workspaceId),
    deps.repos.bank.listByWorkspace(actor.workspaceId),
  ]);
  const bankCodeById = new Map(banks.map((bank) => [bank.id, bank.bankCode]));

  return Promise.all(
    cards.map(async (card) => ({
      ...card,
      availableLimit:
        card.limit - (await deps.repos.invoice.unpaidTotalByCard(card.id)),
      bankCode: bankCodeById.get(card.bankId) ?? 'other',
    }))
  );
}
