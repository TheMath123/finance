/**
 * Testes das fórmulas customizadas (M5-01) contra o Postgres local.
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import { createDb, type Db } from '@finance/db';
import { createTestDeps } from '../../../test/deps';
import type { Actor } from '../../deps';
import { register } from '../auth';
import { createTransaction } from '../transaction';
import {
  createSavedFormula,
  deleteSavedFormula,
  evaluateSavedFormula,
  listSavedFormulas,
  updateSavedFormula,
} from '.';

const uniqueEmail = () => `test-${crypto.randomUUID()}@test.local`;

let db: Db;

beforeAll(() => {
  db = createDb();
});

async function newOwnerActor(): Promise<Actor> {
  const deps = createTestDeps(db);
  const result = await register(deps, {
    name: 'Dono Fórmula',
    email: uniqueEmail(),
    password: 'senha-forte-123',
  });
  if (!result.ok) throw new Error('falha ao registrar usuário de teste');
  return {
    userId: result.value.user.id,
    workspaceId: result.value.defaultWorkspaceId,
    role: 'owner',
  };
}

/** Lança uma transação de despesa no workspace do ator, usando a conta/categoria padrão do seed. */
async function seedExpense(
  deps: ReturnType<typeof createTestDeps>,
  actor: Actor,
  amount: number,
  date: string
) {
  const accounts = await deps.repos.account.listByWorkspace(actor.workspaceId);
  const categories = await deps.repos.category.listByWorkspace(
    actor.workspaceId
  );
  const category = categories.find((c) => !c.isFallback) ?? categories[0];
  if (!accounts[0] || !category)
    throw new Error('seed do workspace incompleto');

  const created = await createTransaction(deps, actor, {
    description: 'Despesa de teste',
    amount,
    type: 'expense',
    method: 'pix',
    date,
    categoryId: category.id,
    accountId: accounts[0].id,
  });
  if (!created.ok) throw new Error('falha ao lançar transação de teste');
}

function currentPeriod(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

describe('saved-formula: criação valida a expressão', () => {
  test('token desconhecido é rejeitado', async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();

    const result = await createSavedFormula(deps, actor, {
      name: 'Fórmula inválida',
      expression: 'saldo_que_nao_existe + despesas',
      displayFormat: 'currency',
      pinnedHome: false,
      pinnedTransactions: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('unknown_variable');
  });

  test('expressão válida (soma/subtração de variáveis conhecidas) é aceita', async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();

    const result = await createSavedFormula(deps, actor, {
      name: 'Sobra do mês',
      expression: 'receitas - despesas',
      displayFormat: 'currency',
      pinnedHome: true,
      pinnedTransactions: false,
    });

    expect(result.ok).toBe(true);
  });
});

describe('saved-formula: limite de plano (free)', () => {
  test('bloqueia a 11ª fórmula salva num workspace free', async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();

    for (let i = 0; i < 10; i++) {
      const result = await createSavedFormula(deps, actor, {
        name: `Fórmula ${i}`,
        expression: 'despesas',
        displayFormat: 'number',
        pinnedHome: false,
        pinnedTransactions: false,
      });
      expect(result.ok).toBe(true);
    }

    const eleventh = await createSavedFormula(deps, actor, {
      name: 'Fórmula 11',
      expression: 'despesas',
      displayFormat: 'number',
      pinnedHome: false,
      pinnedTransactions: false,
    });
    expect(eleventh.ok).toBe(false);
    if (!eleventh.ok) expect(eleventh.error).toBe('plan_limit_reached');
  });
});

describe('saved-formula: avaliação bate com o valor real', () => {
  test('evaluate devolve o número certo pra uma fórmula simples', async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();
    const { year, month } = currentPeriod();
    const date = `${year}-${String(month).padStart(2, '0')}-10`;

    await seedExpense(deps, actor, 15_000, date);
    await seedExpense(deps, actor, 5_000, date);

    const created = await createSavedFormula(deps, actor, {
      name: 'Despesas x2',
      expression: 'despesas * 2',
      displayFormat: 'currency',
      pinnedHome: false,
      pinnedTransactions: false,
    });
    if (!created.ok) throw new Error('fórmula não criada');

    const evaluated = await evaluateSavedFormula(deps, actor, created.value.id);
    expect(evaluated.ok).toBe(true);
    // Variáveis entram em reais (não centavos) — 20.000 centavos = R$200 * 2 = 400.
    if (evaluated.ok) expect(evaluated.value.value).toBe(400);
  });

  test('mês encerrado sem disponível projetado: avaliar nesse mês vira unknown_variable, não quebra', async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();

    // Criada no mês corrente, onde `disponivel_projetado` existe no catálogo.
    const created = await createSavedFormula(deps, actor, {
      name: 'Usa disponível projetado',
      expression: 'disponivel_projetado',
      displayFormat: 'currency',
      pinnedHome: false,
      pinnedTransactions: false,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error('fórmula não criada');

    // Mês bem no passado — garante `projectedAvailable === null` (mês encerrado),
    // então o token nem entra no catálogo pra esse período.
    const past = new Date();
    past.setMonth(past.getMonth() - 6);
    const evaluated = await evaluateSavedFormula(
      deps,
      actor,
      created.value.id,
      past.getFullYear(),
      past.getMonth() + 1
    );
    expect(evaluated.ok).toBe(false);
    if (!evaluated.ok) expect(evaluated.error).toBe('unknown_variable');
  });
});

describe('saved-formula: isolamento por workspace', () => {
  test('fórmulas de um workspace não aparecem na listagem de outro', async () => {
    const deps = createTestDeps(db);
    const actorA = await newOwnerActor();
    const actorB = await newOwnerActor();

    const created = await createSavedFormula(deps, actorA, {
      name: 'Só do workspace A',
      expression: 'despesas',
      displayFormat: 'number',
      pinnedHome: false,
      pinnedTransactions: false,
    });
    expect(created.ok).toBe(true);

    const listA = await listSavedFormulas(deps, actorA);
    const listB = await listSavedFormulas(deps, actorB);
    expect(listA.some((f) => f.name === 'Só do workspace A')).toBe(true);
    expect(listB.some((f) => f.name === 'Só do workspace A')).toBe(false);
  });
});

describe('saved-formula: atualização', () => {
  test('atualiza nome e expressão válidos; rejeita token desconhecido sem persistir', async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();

    const created = await createSavedFormula(deps, actor, {
      name: 'Nome original',
      expression: 'despesas',
      displayFormat: 'number',
      pinnedHome: false,
      pinnedTransactions: false,
    });
    if (!created.ok) throw new Error('fórmula não criada');

    const updated = await updateSavedFormula(deps, actor, created.value.id, {
      name: 'Nome novo',
      expression: 'despesas + receitas',
    });
    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value.name).toBe('Nome novo');
      expect(updated.value.expression).toBe('despesas + receitas');
    }

    const rejected = await updateSavedFormula(deps, actor, created.value.id, {
      expression: 'variavel_inexistente',
    });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error).toBe('unknown_variable');

    // A rejeição não deve ter sobrescrito a expressão válida anterior.
    const list = await listSavedFormulas(deps, actor);
    const stillValid = list.find((f) => f.id === created.value.id);
    expect(stillValid?.expression).toBe('despesas + receitas');
  });
});

describe('saved-formula: exclusão', () => {
  test('excluir remove a fórmula da listagem', async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();

    const created = await createSavedFormula(deps, actor, {
      name: 'Vai ser excluída',
      expression: 'despesas',
      displayFormat: 'number',
      pinnedHome: false,
      pinnedTransactions: false,
    });
    if (!created.ok) throw new Error('fórmula não criada');

    const deleted = await deleteSavedFormula(deps, actor, created.value.id);
    expect(deleted.ok).toBe(true);

    const list = await listSavedFormulas(deps, actor);
    expect(list.some((f) => f.id === created.value.id)).toBe(false);
  });
});
