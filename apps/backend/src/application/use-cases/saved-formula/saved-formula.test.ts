/**
 * Testes das fórmulas customizadas (M5-01) contra o Postgres local.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createDb, type Db, workspaces } from '@finance/db';
import { eq } from 'drizzle-orm';
import { cleanupTestPlans } from '../../../test/cleanup-test-plans';
import { createTestDeps } from '../../../test/deps';
import type { Actor } from '../../deps';
import { createPlan } from '../admin';
import { register } from '../auth';
import { createCard } from '../card';
import { createTransaction } from '../transaction';
import {
  createSavedFormula,
  deleteSavedFormula,
  evaluateSavedFormula,
  listSavedFormulas,
  reorderSavedFormulas,
  updateSavedFormula,
} from '.';

const uniqueEmail = () => `test-${crypto.randomUUID()}@test.local`;

let db: Db;

beforeAll(() => {
  db = createDb();
});

afterAll(async () => {
  await cleanupTestPlans(db, ['test-guard-plan-'], []);
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

describe('saved-formula: downgrade enforcement (fixação além do limite)', () => {
  test('fórmula em excesso já fixada continua fixada; só bloqueia fixar novas além do limite', async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();

    // Plano de teste próprio com limite de 2 fórmulas — cria 2, fixa as 2 na
    // Home (dentro do limite).
    const roomyPlan = await createPlan(deps, actor.userId, {
      key: `test-guard-plan-${crypto.randomUUID().slice(0, 8)}`,
      name: 'Plano de teste (2 fórmulas)',
      trialDays: 0,
      limits: {
        maxOwnedSharedWorkspaces: 1,
        maxMembersPerWorkspace: 5,
        maxSavedFormulasPerWorkspace: 2,
      },
      features: [],
    });
    if (!roomyPlan.ok) throw new Error('setup falhou');
    await db
      .update(workspaces)
      .set({ planId: roomyPlan.value.id })
      .where(eq(workspaces.id, actor.workspaceId));

    const first = await createSavedFormula(deps, actor, {
      name: 'Fórmula A',
      expression: 'despesas',
      displayFormat: 'number',
      pinnedHome: true,
      pinnedTransactions: false,
    });
    expect(first.ok).toBe(true);
    const second = await createSavedFormula(deps, actor, {
      name: 'Fórmula B',
      expression: 'despesas',
      displayFormat: 'number',
      pinnedHome: true,
      pinnedTransactions: false,
    });
    expect(second.ok).toBe(true);

    // Downgrade pra um plano que só permite 1 fórmula fixada — as 2 já
    // fixadas continuam fixadas (grandfathering, nunca desfixa à força).
    if (!first.ok || !second.ok) return;
    const strictPlan = await createPlan(deps, actor.userId, {
      key: `test-guard-plan-${crypto.randomUUID().slice(0, 8)}`,
      name: 'Plano de teste (1 fórmula fixada)',
      trialDays: 0,
      limits: {
        maxOwnedSharedWorkspaces: 1,
        maxMembersPerWorkspace: 5,
        maxSavedFormulasPerWorkspace: 1,
      },
      features: [],
    });
    if (!strictPlan.ok) throw new Error('setup falhou');
    await db
      .update(workspaces)
      .set({ planId: strictPlan.value.id })
      .where(eq(workspaces.id, actor.workspaceId));

    const stillPinned = await deps.repos.savedFormula.findInWorkspace(
      actor.workspaceId,
      first.value.id
    );
    expect(stillPinned?.pinnedHome).toBe(true);

    // Fixar uma terceira fórmula (nova, dentro do limite de contagem 2≤2?
    // não — total já bateu o antigo limite de 2, então criação também
    // bloqueia; o que importa aqui é o desfixar/fixar de uma JÁ existente).
    const unpinned = await createSavedFormula(deps, actor, {
      name: 'Fórmula C (não fixada)',
      expression: 'despesas',
      displayFormat: 'number',
      pinnedHome: false,
      pinnedTransactions: false,
    });
    // total já em 2 (limite antigo) — criação de uma terceira formula
    // (mesmo não fixada) já é bloqueada pelo limite de contagem total.
    expect(unpinned.ok).toBe(false);

    // Tentar fixar a segunda fórmula (já tinha pinnedHome=true — despin +
    // repin) — despina primeiro pra simular o caso real de fixar uma
    // fórmula existente além do limite.
    const despun = await updateSavedFormula(deps, actor, second.value.id, {
      pinnedHome: false,
    });
    expect(despun.ok).toBe(true);

    const repin = await updateSavedFormula(deps, actor, second.value.id, {
      pinnedHome: true,
    });
    expect(repin.ok).toBe(false);
    if (!repin.ok) expect(repin.error).toBe('plan_limit_reached');
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

describe('saved-formula: catálogo estendido (conta, cartão, método)', () => {
  test('saldo por conta aparece no catálogo e some quando a conta é arquivada', async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();
    const accounts = await deps.repos.account.listByWorkspace(
      actor.workspaceId
    );
    const account = accounts[0];
    if (!account) throw new Error('conta padrão do seed não encontrada');

    const { year, month } = currentPeriod();
    const date = `${year}-${String(month).padStart(2, '0')}-10`;
    await seedExpense(deps, actor, 10_000, date);

    const token = `saldo_conta_${account.id.replaceAll('-', '')}`;
    const created = await createSavedFormula(deps, actor, {
      name: 'Saldo da conta',
      expression: token,
      displayFormat: 'currency',
      pinnedHome: false,
      pinnedTransactions: false,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error('fórmula não criada');

    const evaluated = await evaluateSavedFormula(deps, actor, created.value.id);
    expect(evaluated.ok).toBe(true);
    // initialBalance=0 (seed) − 100,00 (despesa) = −100,00.
    if (evaluated.ok) expect(evaluated.value.value).toBe(-100);

    await deps.repos.account.setArchived(account.id, true);
    const afterArchive = await evaluateSavedFormula(
      deps,
      actor,
      created.value.id
    );
    expect(afterArchive.ok).toBe(false);
    if (!afterArchive.ok) expect(afterArchive.error).toBe('unknown_variable');
  });

  test('fatura em aberto por cartão aparece no catálogo e some quando o cartão é arquivado', async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();

    const card = await createCard(deps, actor, {
      name: 'Cartão de teste',
      bankCode: 'other',
      limit: 500_000,
      closingDay: 10,
      dueDay: 20,
    });
    if (!card.ok) throw new Error('cartão não criado');

    const categories = await deps.repos.category.listByWorkspace(
      actor.workspaceId
    );
    const category = categories.find((c) => !c.isFallback) ?? categories[0];
    if (!category) throw new Error('categoria não encontrada');

    const { year, month } = currentPeriod();
    const date = `${year}-${String(month).padStart(2, '0')}-05`;
    const tx = await createTransaction(deps, actor, {
      description: 'Compra no crédito',
      amount: 25_000,
      type: 'expense',
      method: 'credit',
      date,
      categoryId: category.id,
      cardId: card.value.id,
    });
    expect(tx.ok).toBe(true);

    const token = `fatura_cartao_${card.value.id.replaceAll('-', '')}`;
    const created = await createSavedFormula(deps, actor, {
      name: 'Fatura do cartão',
      expression: token,
      displayFormat: 'currency',
      pinnedHome: false,
      pinnedTransactions: false,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error('fórmula não criada');

    const evaluated = await evaluateSavedFormula(deps, actor, created.value.id);
    expect(evaluated.ok).toBe(true);
    if (evaluated.ok) expect(evaluated.value.value).toBe(250);

    await deps.repos.card.setArchived(card.value.id, true);
    const afterArchive = await evaluateSavedFormula(
      deps,
      actor,
      created.value.id
    );
    expect(afterArchive.ok).toBe(false);
    if (!afterArchive.ok) expect(afterArchive.error).toBe('unknown_variable');
  });

  test('despesa por método de pagamento soma certo', async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();
    const { year, month } = currentPeriod();
    const date = `${year}-${String(month).padStart(2, '0')}-12`;

    // seedExpense sempre lança via método pix.
    await seedExpense(deps, actor, 8_000, date);

    const created = await createSavedFormula(deps, actor, {
      name: 'Despesa via Pix',
      expression: 'despesa_metodo_pix',
      displayFormat: 'currency',
      pinnedHome: false,
      pinnedTransactions: false,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error('fórmula não criada');

    const evaluated = await evaluateSavedFormula(deps, actor, created.value.id);
    expect(evaluated.ok).toBe(true);
    if (evaluated.ok) expect(evaluated.value.value).toBe(80);
  });
});

describe('saved-formula: pin atribui ordem automaticamente', () => {
  test('cada nova fórmula fixada entra ao fim da fila (0, 1, 2, ...)', async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();

    const created: { id: string; homeOrder: number | null }[] = [];
    for (let i = 0; i < 3; i++) {
      const result = await createSavedFormula(deps, actor, {
        name: `Fixada ${i}`,
        expression: 'despesas',
        displayFormat: 'number',
        pinnedHome: true,
        pinnedTransactions: false,
      });
      if (!result.ok) throw new Error('fórmula não criada');
      created.push(result.value);
    }
    expect(created.map((f) => f.homeOrder)).toEqual([0, 1, 2]);
  });

  test('despin zera a ordem; repin manda pro fim da fila (não repete a posição antiga)', async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();

    const first = await createSavedFormula(deps, actor, {
      name: 'Primeira',
      expression: 'despesas',
      displayFormat: 'number',
      pinnedHome: true,
      pinnedTransactions: false,
    });
    if (!first.ok) throw new Error('fórmula não criada');
    expect(first.value.homeOrder).toBe(0);

    const second = await createSavedFormula(deps, actor, {
      name: 'Segunda',
      expression: 'despesas',
      displayFormat: 'number',
      pinnedHome: true,
      pinnedTransactions: false,
    });
    if (!second.ok) throw new Error('fórmula não criada');
    expect(second.value.homeOrder).toBe(1);

    const unpinned = await updateSavedFormula(deps, actor, first.value.id, {
      pinnedHome: false,
    });
    expect(unpinned.ok).toBe(true);
    if (unpinned.ok) expect(unpinned.value.homeOrder).toBeNull();

    const repinned = await updateSavedFormula(deps, actor, first.value.id, {
      pinnedHome: true,
    });
    expect(repinned.ok).toBe(true);
    // Volta pro fim da fila (depois da "Segunda", que ficou com order=1) — não repete o antigo 0.
    if (repinned.ok) expect(repinned.value.homeOrder).toBe(2);
  });
});

describe('saved-formula: reorder de widgets fixados', () => {
  test('reorder persiste a sequência certa', async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();

    const created: { id: string }[] = [];
    for (let i = 0; i < 3; i++) {
      const result = await createSavedFormula(deps, actor, {
        name: `Fixada ${i}`,
        expression: 'despesas',
        displayFormat: 'number',
        pinnedHome: true,
        pinnedTransactions: false,
      });
      if (!result.ok) throw new Error('fórmula não criada');
      created.push(result.value);
    }

    const reversed = [created[2]!.id, created[1]!.id, created[0]!.id];
    const reordered = await reorderSavedFormulas(deps, actor, 'home', reversed);
    expect(reordered.ok).toBe(true);

    const list = await listSavedFormulas(deps, actor);
    const byId = new Map(list.map((f) => [f.id, f]));
    expect(byId.get(created[2]!.id)?.homeOrder).toBe(0);
    expect(byId.get(created[1]!.id)?.homeOrder).toBe(1);
    expect(byId.get(created[0]!.id)?.homeOrder).toBe(2);
  });

  test('reorder rejeita id de fórmula que não pertence ao workspace/campo pedido', async () => {
    const deps = createTestDeps(db);
    const actorA = await newOwnerActor();
    const actorB = await newOwnerActor();

    const ownFormula = await createSavedFormula(deps, actorA, {
      name: 'Minha fórmula',
      expression: 'despesas',
      displayFormat: 'number',
      pinnedHome: true,
      pinnedTransactions: false,
    });
    if (!ownFormula.ok) throw new Error('fórmula não criada');

    const otherFormula = await createSavedFormula(deps, actorB, {
      name: 'Fórmula de outro workspace',
      expression: 'despesas',
      displayFormat: 'number',
      pinnedHome: true,
      pinnedTransactions: false,
    });
    if (!otherFormula.ok) throw new Error('fórmula não criada');

    const result = await reorderSavedFormulas(deps, actorA, 'home', [
      ownFormula.value.id,
      otherFormula.value.id,
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('formula_not_found');
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
