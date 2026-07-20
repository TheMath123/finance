/**
 * Testes de split de despesas (M3-03) contra o Postgres local.
 */
import { beforeAll, describe, expect, test } from "bun:test";
import { createDb, type Db } from "@finance/db";
import type { Actor } from "../../deps";
import { createTestDeps } from "../../../test/deps";
import { register } from "../auth";
import { createTransaction } from "../transaction";
import { listNotifications } from "../notification";
import { cancelSplit } from "./cancel-split";
import { confirmShareReimbursement } from "./confirm-reimbursement";
import { createSplit } from "./create-split";
import { listOwedByMe, listOwedToMe } from "./list-owed";
import { markSharePaid } from "./mark-share-paid";
import { listTransactions } from "../transaction";

const uniqueEmail = () => `test-${crypto.randomUUID()}@test.local`;

let db: Db;

beforeAll(() => {
  db = createDb();
});

interface TestUser {
  userId: string;
  email: string;
  name: string;
  workspaceId: string;
  accountId: string;
  categoryId: string;
}

async function newUser(name: string): Promise<TestUser> {
  const deps = createTestDeps(db);
  const email = uniqueEmail();
  const result = await register(deps, { name, email, password: "senha-forte-123" });
  if (!result.ok) throw new Error("falha ao registrar usuário de teste");
  const accounts = await deps.repos.account.listByWorkspace(result.value.defaultWorkspaceId);
  const account = accounts[0];
  const category = await deps.repos.category.findFallback(result.value.defaultWorkspaceId);
  if (!account || !category) throw new Error("workspace de teste sem conta/categoria padrão");
  return {
    userId: result.value.user.id,
    email,
    name,
    workspaceId: result.value.defaultWorkspaceId,
    accountId: account.id,
    categoryId: category.id,
  };
}

function actorFor(user: TestUser): Actor {
  return { userId: user.userId, workspaceId: user.workspaceId, role: "owner" };
}

async function newExpense(deps: ReturnType<typeof createTestDeps>, user: TestUser, amount: number) {
  const result = await createTransaction(deps, actorFor(user), {
    description: "Restaurante",
    amount,
    type: "expense",
    method: "pix",
    date: "2026-07-19",
    categoryId: user.categoryId,
    accountId: user.accountId,
  });
  if (!result.ok) throw new Error("falha ao criar transação de teste");
  return result.value[0]!;
}

describe("createSplit", () => {
  test("divisão igual entre criador + 2 participantes, com notificação", async () => {
    const deps = createTestDeps(db);
    const creator = await newUser("Criador A");
    const p1 = await newUser("Participante A1");
    const p2 = await newUser("Participante A2");
    const tx = await newExpense(deps, creator, 3001);

    const result = await createSplit(deps, actorFor(creator), tx.id, {
      participants: [
        { type: "user", contact: p1.email },
        { type: "user", contact: p2.email },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const shares = await deps.repos.splitShare.listBySplit(result.value.id);
    expect(shares).toHaveLength(2);
    // 3001 / 3 = 1000 resto 1 — resto fica implícito com o criador, participantes levam 1000 cada.
    expect(shares.every((s) => s.amount === 1000)).toBe(true);

    const notif1 = await listNotifications(deps, p1.userId, false);
    expect(notif1.some((n) => n.type === "split_payment_pending")).toBe(true);
  });

  test("valores manuais cuja soma é igual ao total é permitido (criador fica sem parte)", async () => {
    const deps = createTestDeps(db);
    const creator = await newUser("Criador B");
    const p1 = await newUser("Participante B1");
    const tx = await newExpense(deps, creator, 1000);

    const result = await createSplit(deps, actorFor(creator), tx.id, {
      participants: [{ type: "user", contact: p1.email, amount: 1000 }],
    });
    expect(result.ok).toBe(true);
  });

  test("valores manuais cuja soma passa do total é rejeitado", async () => {
    const deps = createTestDeps(db);
    const creator = await newUser("Criador C");
    const p1 = await newUser("Participante C1");
    const tx = await newExpense(deps, creator, 1000);

    const result = await createSplit(deps, actorFor(creator), tx.id, {
      participants: [{ type: "user", contact: p1.email, amount: 1001 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("amounts_exceed_total");
  });

  test("participante inexistente é rejeitado", async () => {
    const deps = createTestDeps(db);
    const creator = await newUser("Criador D");
    const tx = await newExpense(deps, creator, 1000);

    const result = await createSplit(deps, actorFor(creator), tx.id, {
      participants: [{ type: "user", contact: "nao-existe@test.local" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("participant_not_found");
  });

  test("criador não pode se adicionar como participante", async () => {
    const deps = createTestDeps(db);
    const creator = await newUser("Criador E");
    const tx = await newExpense(deps, creator, 1000);

    const result = await createSplit(deps, actorFor(creator), tx.id, {
      participants: [{ type: "user", contact: creator.email }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("self_participant");
  });

  test("participante externo por nome funciona sem conta", async () => {
    const deps = createTestDeps(db);
    const creator = await newUser("Criador F");
    const tx = await newExpense(deps, creator, 900);

    const result = await createSplit(deps, actorFor(creator), tx.id, {
      participants: [{ type: "external", name: "Amigo Externo" }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const shares = await deps.repos.splitShare.listBySplit(result.value.id);
    expect(shares[0]?.participantName).toBe("Amigo Externo");
    expect(shares[0]?.participantUserId).toBeNull();
  });

  test("transação que não é despesa é rejeitada", async () => {
    const deps = createTestDeps(db);
    const creator = await newUser("Criador G");
    const p1 = await newUser("Participante G1");
    const income = await createTransaction(deps, actorFor(creator), {
      description: "Salário",
      amount: 5000,
      type: "income",
      method: "pix",
      date: "2026-07-19",
      categoryId: creator.categoryId,
      accountId: creator.accountId,
    });
    if (!income.ok) throw new Error("setup falhou");

    const result = await createSplit(deps, actorFor(creator), income.value[0]!.id, {
      participants: [{ type: "user", contact: p1.email }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("not_an_expense");
  });

  test("transação já splitada não pode ser splitada de novo", async () => {
    const deps = createTestDeps(db);
    const creator = await newUser("Criador H");
    const p1 = await newUser("Participante H1");
    const tx = await newExpense(deps, creator, 1000);

    const first = await createSplit(deps, actorFor(creator), tx.id, {
      participants: [{ type: "user", contact: p1.email }],
    });
    expect(first.ok).toBe(true);

    const second = await createSplit(deps, actorFor(creator), tx.id, {
      participants: [{ type: "user", contact: p1.email }],
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe("already_split");
  });
});

describe("fluxo de confirmação (dois lados) + reembolso", () => {
  test("participante marca pago, criador confirma, gera reembolso e notifica", async () => {
    const deps = createTestDeps(db);
    const creator = await newUser("Criador I");
    const p1 = await newUser("Participante I1");
    const tx = await newExpense(deps, creator, 2000);

    const split = await createSplit(deps, actorFor(creator), tx.id, {
      participants: [{ type: "user", contact: p1.email }],
    });
    if (!split.ok) throw new Error("setup falhou");
    const share = (await deps.repos.splitShare.listBySplit(split.value.id))[0]!;

    // Confirmar antes de "pago" deve falhar.
    const early = await confirmShareReimbursement(deps, { userId: creator.userId }, share.id);
    expect(early.ok).toBe(false);
    if (!early.ok) expect(early.error).toBe("invalid_transition");

    // Só o próprio participante marca "paguei".
    const wrongPayer = await markSharePaid(deps, { userId: creator.userId }, share.id);
    expect(wrongPayer.ok).toBe(false);
    if (!wrongPayer.ok) expect(wrongPayer.error).toBe("not_participant");

    const paid = await markSharePaid(deps, { userId: p1.userId }, share.id);
    expect(paid.ok).toBe(true);
    if (paid.ok) expect(paid.value.status).toBe("paid");

    // Só o criador confirma.
    const wrongConfirmer = await confirmShareReimbursement(deps, { userId: p1.userId }, share.id);
    expect(wrongConfirmer.ok).toBe(false);
    if (!wrongConfirmer.ok) expect(wrongConfirmer.error).toBe("not_creator");

    const confirmed = await confirmShareReimbursement(deps, { userId: creator.userId }, share.id);
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.value.status).toBe("confirmed");
    expect(confirmed.value.reimbursementTransactionId).not.toBeNull();

    const reimbursement = await deps.repos.transaction.findInWorkspace(
      creator.workspaceId,
      confirmed.value.reimbursementTransactionId!,
    );
    expect(reimbursement?.type).toBe("income");
    expect(reimbursement?.amount).toBe(1000);

    const notif = await listNotifications(deps, p1.userId, false);
    expect(notif.some((n) => n.type === "split_reimbursement_confirmed")).toBe(true);
  });

  test("participante externo confirma direto (sem passar por 'pago')", async () => {
    const deps = createTestDeps(db);
    const creator = await newUser("Criador J");
    const tx = await newExpense(deps, creator, 1000);

    const split = await createSplit(deps, actorFor(creator), tx.id, {
      participants: [{ type: "external", name: "Amigo J" }],
    });
    if (!split.ok) throw new Error("setup falhou");
    const share = (await deps.repos.splitShare.listBySplit(split.value.id))[0]!;

    const confirmed = await confirmShareReimbursement(deps, { userId: creator.userId }, share.id);
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) expect(confirmed.value.status).toBe("confirmed");
  });

  test("duas chamadas paralelas de confirm: só uma vence a corrida, nunca dois reembolsos", async () => {
    const deps = createTestDeps(db);
    const creator = await newUser("Criador Corrida");
    const tx = await newExpense(deps, creator, 1000);

    const split = await createSplit(deps, actorFor(creator), tx.id, {
      participants: [{ type: "external", name: "Amigo Corrida" }],
    });
    if (!split.ok) throw new Error("setup falhou");
    const share = (await deps.repos.splitShare.listBySplit(split.value.id))[0]!;

    const [first, second] = await Promise.all([
      confirmShareReimbursement(deps, { userId: creator.userId }, share.id),
      confirmShareReimbursement(deps, { userId: creator.userId }, share.id),
    ]);

    const results = [first, second];
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const failed = results.find((r) => !r.ok);
    expect(failed && !failed.ok ? failed.error : null).toBe("invalid_transition");

    const finalShare = await deps.repos.splitShare.findById(share.id);
    expect(finalShare?.status).toBe("confirmed");
    expect(finalShare?.reimbursementTransactionId).not.toBeNull();
  });
});

describe("cancelSplit", () => {
  test("cancela quando nenhuma parte foi paga", async () => {
    const deps = createTestDeps(db);
    const creator = await newUser("Criador K");
    const p1 = await newUser("Participante K1");
    const tx = await newExpense(deps, creator, 1000);

    const split = await createSplit(deps, actorFor(creator), tx.id, {
      participants: [{ type: "user", contact: p1.email }],
    });
    if (!split.ok) throw new Error("setup falhou");

    const cancelled = await cancelSplit(deps, { userId: creator.userId }, split.value.id);
    expect(cancelled.ok).toBe(true);
    if (cancelled.ok) expect(cancelled.value.cancelledAt).not.toBeNull();
  });

  test("bloqueia cancelamento depois que uma parte foi paga", async () => {
    const deps = createTestDeps(db);
    const creator = await newUser("Criador L");
    const p1 = await newUser("Participante L1");
    const tx = await newExpense(deps, creator, 1000);

    const split = await createSplit(deps, actorFor(creator), tx.id, {
      participants: [{ type: "user", contact: p1.email }],
    });
    if (!split.ok) throw new Error("setup falhou");
    const share = (await deps.repos.splitShare.listBySplit(split.value.id))[0]!;
    await markSharePaid(deps, { userId: p1.userId }, share.id);

    const cancelled = await cancelSplit(deps, { userId: creator.userId }, split.value.id);
    expect(cancelled.ok).toBe(false);
    if (!cancelled.ok) expect(cancelled.error).toBe("shares_already_settled");
  });

  test("só o criador pode cancelar", async () => {
    const deps = createTestDeps(db);
    const creator = await newUser("Criador M");
    const p1 = await newUser("Participante M1");
    const tx = await newExpense(deps, creator, 1000);

    const split = await createSplit(deps, actorFor(creator), tx.id, {
      participants: [{ type: "user", contact: p1.email }],
    });
    if (!split.ok) throw new Error("setup falhou");

    const result = await cancelSplit(deps, { userId: p1.userId }, split.value.id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("not_creator");
  });
});

describe("listOwedByMe / listOwedToMe", () => {
  test("aparece nas duas listas até ser confirmado", async () => {
    const deps = createTestDeps(db);
    const creator = await newUser("Criador N");
    const p1 = await newUser("Participante N1");
    const tx = await newExpense(deps, creator, 1000);

    const split = await createSplit(deps, actorFor(creator), tx.id, {
      participants: [{ type: "user", contact: p1.email }],
    });
    if (!split.ok) throw new Error("setup falhou");
    const share = (await deps.repos.splitShare.listBySplit(split.value.id))[0]!;

    const owedByP1 = await listOwedByMe(deps, { userId: p1.userId });
    expect(owedByP1.some((o) => o.shareId === share.id)).toBe(true);

    const owedToCreator = await listOwedToMe(deps, { userId: creator.userId });
    expect(owedToCreator.some((o) => o.shareId === share.id)).toBe(true);

    await markSharePaid(deps, { userId: p1.userId }, share.id);
    await confirmShareReimbursement(deps, { userId: creator.userId }, share.id);

    const owedByP1After = await listOwedByMe(deps, { userId: p1.userId });
    expect(owedByP1After.some((o) => o.shareId === share.id)).toBe(false);
  });
});

describe("listTransactions: indicador hasActiveSplit (auditoria 2026-07-20)", () => {
  test("true com split ativo, false sem split e depois de cancelado", async () => {
    const deps = createTestDeps(db);
    const creator = await newUser("Criador Split Flag");
    const p1 = await newUser("Participante Split Flag");
    const withSplit = await newExpense(deps, creator, 4000);
    const withoutSplit = await newExpense(deps, creator, 1000);

    const split = await createSplit(deps, actorFor(creator), withSplit.id, {
      participants: [{ type: "user", contact: p1.email }],
    });
    if (!split.ok) throw new Error("setup falhou");

    const listed = await listTransactions(deps, actorFor(creator), {});
    const flagged = listed.find((t) => t.id === withSplit.id);
    const unflagged = listed.find((t) => t.id === withoutSplit.id);
    expect(flagged?.hasActiveSplit).toBe(true);
    expect(unflagged?.hasActiveSplit).toBe(false);

    await cancelSplit(deps, actorFor(creator), split.value.id);
    const afterCancel = await listTransactions(deps, actorFor(creator), {});
    expect(afterCancel.find((t) => t.id === withSplit.id)?.hasActiveSplit).toBe(false);
  });
});
