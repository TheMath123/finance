import { describe, expect, test } from 'bun:test';
import { createInMemoryTokenBudget } from './in-memory-token-budget';

/** Mesmo valor padrão embutido em `createInMemoryTokenBudget` (só pra testes). */
const DAILY_TOKEN_BUDGET_PER_USER = 100_000;

describe('in-memory token budget', () => {
  test('começa dentro do orçamento', async () => {
    const budget = createInMemoryTokenBudget();
    expect(await budget.isOverBudget('user-1')).toBe(false);
  });

  test('registra uso e soma entre chamadas', async () => {
    const budget = createInMemoryTokenBudget();
    await budget.recordUsage('user-1', 100);
    await budget.recordUsage('user-1', 50);
    expect(await budget.isOverBudget('user-1')).toBe(false);
  });

  test('estoura o orçamento diário', async () => {
    const budget = createInMemoryTokenBudget();
    await budget.recordUsage('user-1', DAILY_TOKEN_BUDGET_PER_USER);
    expect(await budget.isOverBudget('user-1')).toBe(true);
  });

  test('orçamento é isolado por usuário', async () => {
    const budget = createInMemoryTokenBudget();
    await budget.recordUsage('user-1', DAILY_TOKEN_BUDGET_PER_USER);
    expect(await budget.isOverBudget('user-2')).toBe(false);
  });
});
