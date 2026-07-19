/**
 * Testes de transferência entre usuários + contato confiável (M3-02) contra o Postgres local.
 */
import { beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { createDb, interUserTransfers, type Db } from "@finance/db";
import type { Actor } from "../../deps";
import { createTestDeps } from "../../../test/deps";
import { register } from "../auth";
import { listNotifications } from "../notification";
import { runNotificationSweep } from "../notification/sweep";
import { acceptTransfer } from "./accept-transfer";
import { createTransfer } from "./create-transfer";
import { rejectTransfer } from "./reject-transfer";
import { listPendingTransfers } from "./list-pending-transfers";
import { listTrustedContacts, removeTrustedContact } from "./trusted-contacts";

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
}

async function newUser(name: string): Promise<TestUser> {
  const deps = createTestDeps(db);
  const email = uniqueEmail();
  const result = await register(deps, { name, email, password: "senha-forte-123" });
  if (!result.ok) throw new Error("falha ao registrar usuário de teste");
  const accounts = await deps.repos.account.listByWorkspace(result.value.defaultWorkspaceId);
  const account = accounts[0];
  if (!account) throw new Error("workspace de teste sem conta padrão");
  return {
    userId: result.value.user.id,
    email,
    name,
    workspaceId: result.value.defaultWorkspaceId,
    accountId: account.id,
  };
}

function actorFor(user: TestUser): Actor {
  return { userId: user.userId, workspaceId: user.workspaceId, role: "owner" };
}

describe("createTransfer", () => {
  test("resposta com erro quando destinatário não existe", async () => {
    const deps = createTestDeps(db);
    const sender = await newUser("Remetente A");

    const result = await createTransfer(deps, actorFor(sender), {
      recipient: "nao-existe@test.local",
      amount: 1000,
      description: "teste",
      accountId: sender.accountId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("recipient_not_found");
  });

  test("erro ao transferir pra si mesmo", async () => {
    const deps = createTestDeps(db);
    const sender = await newUser("Remetente B");

    const result = await createTransfer(deps, actorFor(sender), {
      recipient: sender.email,
      amount: 1000,
      description: "teste",
      accountId: sender.accountId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("self_transfer");
  });

  test("erro de valor inválido (zero ou negativo)", async () => {
    const deps = createTestDeps(db);
    const sender = await newUser("Remetente C");
    const recipient = await newUser("Destinatário C");

    const result = await createTransfer(deps, actorFor(sender), {
      recipient: recipient.email,
      amount: 0,
      description: "teste",
      accountId: sender.accountId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_amount");
  });

  test("cria transferência pendente, debita o remetente e notifica o destinatário", async () => {
    const deps = createTestDeps(db);
    const sender = await newUser("Remetente D");
    const recipient = await newUser("Destinatário D");

    const result = await createTransfer(deps, actorFor(sender), {
      recipient: recipient.email,
      amount: 5000,
      description: "Aluguel dividido",
      accountId: sender.accountId,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("pending");
    expect(result.value.toTransactionId).toBeNull();

    const fromTx = await deps.repos.transaction.findInWorkspace(sender.workspaceId, result.value.fromTransactionId);
    expect(fromTx?.amount).toBe(5000);
    expect(fromTx?.type).toBe("expense");

    const notifications = await listNotifications(deps, recipient.userId, false);
    expect(notifications.some((n) => n.type === "transfer_pending")).toBe(true);

    const pending = await listPendingTransfers(deps, { userId: recipient.userId });
    expect(pending.some((p) => p.id === result.value.id)).toBe(true);
  });

  test("rate limit: 11ª transferência na mesma hora é bloqueada", async () => {
    const deps = createTestDeps(db);
    const sender = await newUser("Remetente Flood");
    const recipient = await newUser("Destinatário Flood");

    let last;
    for (let i = 0; i < 11; i++) {
      last = await createTransfer(deps, actorFor(sender), {
        recipient: recipient.email,
        amount: 100,
        description: `transferência ${i}`,
        accountId: sender.accountId,
      });
    }
    expect(last?.ok).toBe(false);
    if (last && !last.ok) expect(last.error).toBe("rate_limited");
  });
});

describe("acceptTransfer / rejectTransfer", () => {
  test("destinatário aceita escolhendo conta — gera entrada e notifica o remetente", async () => {
    const deps = createTestDeps(db);
    const sender = await newUser("Remetente E");
    const recipient = await newUser("Destinatário E");

    const created = await createTransfer(deps, actorFor(sender), {
      recipient: recipient.email,
      amount: 2500,
      description: "Cinema",
      accountId: sender.accountId,
    });
    if (!created.ok) throw new Error("setup falhou");

    const accepted = await acceptTransfer(deps, { userId: recipient.userId }, {
      transferId: created.value.id,
      accountId: recipient.accountId,
    });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.value.status).toBe("accepted");
    expect(accepted.value.toTransactionId).not.toBeNull();

    const toTx = await deps.repos.transaction.findInWorkspace(recipient.workspaceId, accepted.value.toTransactionId!);
    expect(toTx?.amount).toBe(2500);
    expect(toTx?.type).toBe("income");

    const notifications = await listNotifications(deps, sender.userId, false);
    expect(notifications.some((n) => n.type === "transfer_accepted")).toBe(true);
  });

  test("outro usuário não consegue aceitar transferência que não é dele", async () => {
    const deps = createTestDeps(db);
    const sender = await newUser("Remetente F");
    const recipient = await newUser("Destinatário F");
    const intruder = await newUser("Intruso F");

    const created = await createTransfer(deps, actorFor(sender), {
      recipient: recipient.email,
      amount: 1000,
      description: "teste",
      accountId: sender.accountId,
    });
    if (!created.ok) throw new Error("setup falhou");

    const result = await acceptTransfer(deps, { userId: intruder.userId }, {
      transferId: created.value.id,
      accountId: intruder.accountId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("not_recipient");
  });

  test("recusa marca rejected e não gera transação de entrada", async () => {
    const deps = createTestDeps(db);
    const sender = await newUser("Remetente G");
    const recipient = await newUser("Destinatário G");

    const created = await createTransfer(deps, actorFor(sender), {
      recipient: recipient.email,
      amount: 1000,
      description: "teste",
      accountId: sender.accountId,
    });
    if (!created.ok) throw new Error("setup falhou");

    const rejected = await rejectTransfer(deps, { userId: recipient.userId }, created.value.id);
    expect(rejected.ok).toBe(true);
    if (rejected.ok) {
      expect(rejected.value.status).toBe("rejected");
      expect(rejected.value.toTransactionId).toBeNull();
    }
  });

  test("transferência já finalizada não pode ser aceita/recusada de novo", async () => {
    const deps = createTestDeps(db);
    const sender = await newUser("Remetente H");
    const recipient = await newUser("Destinatário H");

    const created = await createTransfer(deps, actorFor(sender), {
      recipient: recipient.email,
      amount: 1000,
      description: "teste",
      accountId: sender.accountId,
    });
    if (!created.ok) throw new Error("setup falhou");

    await rejectTransfer(deps, { userId: recipient.userId }, created.value.id);
    const secondAttempt = await rejectTransfer(deps, { userId: recipient.userId }, created.value.id);
    expect(secondAttempt.ok).toBe(false);
    if (!secondAttempt.ok) expect(secondAttempt.error).toBe("already_finalized");
  });

  test("duas chamadas paralelas de accept: só uma vence a corrida, nunca duas transações de entrada", async () => {
    const deps = createTestDeps(db);
    const sender = await newUser("Remetente Corrida");
    const recipient = await newUser("Destinatário Corrida");

    const created = await createTransfer(deps, actorFor(sender), {
      recipient: recipient.email,
      amount: 1000,
      description: "corrida",
      accountId: sender.accountId,
    });
    if (!created.ok) throw new Error("setup falhou");

    const [first, second] = await Promise.all([
      acceptTransfer(deps, { userId: recipient.userId }, {
        transferId: created.value.id,
        accountId: recipient.accountId,
      }),
      acceptTransfer(deps, { userId: recipient.userId }, {
        transferId: created.value.id,
        accountId: recipient.accountId,
      }),
    ]);

    const results = [first, second];
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const failed = results.find((r) => !r.ok);
    expect(failed && !failed.ok ? failed.error : null).toBe("already_finalized");

    const final = await deps.repos.interUserTransfer.findById(created.value.id);
    expect(final?.status).toBe("accepted");
    expect(final?.toTransactionId).not.toBeNull();
  });
});

describe("contato confiável", () => {
  test("aceitar marcando confiável faz a próxima transferência entrar automático", async () => {
    const deps = createTestDeps(db);
    const sender = await newUser("Remetente I");
    const recipient = await newUser("Destinatário I");

    const first = await createTransfer(deps, actorFor(sender), {
      recipient: recipient.email,
      amount: 1000,
      description: "primeira",
      accountId: sender.accountId,
    });
    if (!first.ok) throw new Error("setup falhou");

    const accepted = await acceptTransfer(deps, { userId: recipient.userId }, {
      transferId: first.value.id,
      accountId: recipient.accountId,
      markTrusted: true,
    });
    expect(accepted.ok).toBe(true);

    const contacts = await listTrustedContacts(deps, { userId: recipient.userId });
    const contact = contacts.find((c) => c.trustedUserId === sender.userId);
    expect(contact).toBeDefined();
    expect(contact?.defaultAccountId).toBe(recipient.accountId);

    const second = await createTransfer(deps, actorFor(sender), {
      recipient: recipient.email,
      amount: 2000,
      description: "segunda, já confiável",
      accountId: sender.accountId,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    // Auto-aceite: nasce já "accepted", sem passar por pending.
    expect(second.value.status).toBe("accepted");
    expect(second.value.toTransactionId).not.toBeNull();

    const notifications = await listNotifications(deps, sender.userId, false);
    expect(notifications.some((n) => n.type === "transfer_accepted")).toBe(true);

    await removeTrustedContact(deps, { userId: recipient.userId }, contact!.id);
    const afterRemoval = await listTrustedContacts(deps, { userId: recipient.userId });
    expect(afterRemoval.some((c) => c.id === contact!.id)).toBe(false);
  });
});

describe("sweep de expiração", () => {
  test("transferência pendente vencida vira expired sem afetar a transação do remetente", async () => {
    const deps = createTestDeps(db);
    const sender = await newUser("Remetente J");
    const recipient = await newUser("Destinatário J");

    const created = await createTransfer(deps, actorFor(sender), {
      recipient: recipient.email,
      amount: 1000,
      description: "vai expirar",
      accountId: sender.accountId,
    });
    if (!created.ok) throw new Error("setup falhou");

    // Força a expiração já vencida direto no schema (create-transfer sempre calcula +30 dias).
    await db
      .update(interUserTransfers)
      .set({ expiresAt: new Date(Date.now() - 24 * 60 * 60_000) })
      .where(eq(interUserTransfers.id, created.value.id));

    await runNotificationSweep(deps);

    const swept = await deps.repos.interUserTransfer.findById(created.value.id);
    expect(swept?.status).toBe("expired");

    const fromTx = await deps.repos.transaction.findInWorkspace(sender.workspaceId, created.value.fromTransactionId);
    expect(fromTx).toBeDefined();
  });
});
