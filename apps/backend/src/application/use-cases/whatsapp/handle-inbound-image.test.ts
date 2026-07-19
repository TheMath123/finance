/**
 * Testes do anexo de comprovante via foto no WhatsApp (M3-05) contra o Postgres local (storage in-memory).
 */
import { beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { createDb, transactions, type Db } from "@finance/db";
import type { Actor } from "../../deps";
import { createTestDeps } from "../../../test/deps";
import { register } from "../auth";
import { createTransaction } from "../transaction";
import { handleInboundWhatsAppImage } from "./handle-inbound-image";

const uniqueEmail = () => `test-${crypto.randomUUID()}@test.local`;
const uniquePhone = () => `+55119${Math.floor(Math.random() * 100_000_000)}`;

let db: Db;

beforeAll(() => {
  db = createDb();
});

interface TestUser {
  actor: Actor;
  phone: string;
}

async function newLinkedUser(deps: ReturnType<typeof createTestDeps>): Promise<TestUser> {
  const result = await register(deps, { name: "Dono", email: uniqueEmail(), password: "senha-forte-123" });
  if (!result.ok) throw new Error("falha ao registrar usuário de teste");
  const phone = uniquePhone();
  await deps.repos.user.updatePhone(result.value.user.id, phone);
  return { actor: { userId: result.value.user.id, workspaceId: result.value.defaultWorkspaceId, role: "owner" }, phone };
}

async function newTransactionFor(deps: ReturnType<typeof createTestDeps>, actor: Actor): Promise<string> {
  const category = await deps.repos.category.findFallback(actor.workspaceId);
  const accounts = await deps.repos.account.listByWorkspace(actor.workspaceId);
  const account = accounts[0];
  if (!category || !account) throw new Error("workspace de teste sem conta/categoria padrão");
  const tx = await createTransaction(deps, actor, {
    description: "Mercado",
    amount: 1000,
    type: "expense",
    method: "pix",
    date: "2026-07-19",
    categoryId: category.id,
    accountId: account.id,
  });
  if (!tx.ok) throw new Error("falha ao criar transação de teste");
  return tx.value[0]!.id;
}

describe("handleInboundWhatsAppImage", () => {
  test("número não vinculado não anexa nada", async () => {
    const deps = createTestDeps(db);
    const reply = await handleInboundWhatsAppImage(deps, {
      from: uniquePhone(),
      buffer: new Uint8Array([1]),
      mimeType: "image/jpeg",
    });
    expect(reply.body).toContain("não está vinculado");
  });

  test("sem transação recente, pede pra registrar primeiro", async () => {
    const deps = createTestDeps(db);
    const user = await newLinkedUser(deps);

    const reply = await handleInboundWhatsAppImage(deps, {
      from: user.phone,
      buffer: new Uint8Array([1]),
      mimeType: "image/jpeg",
    });
    expect(reply.body).toContain("Não encontrei nenhuma transação recente");
  });

  test("anexa a foto na transação mais recente", async () => {
    const deps = createTestDeps(db);
    const user = await newLinkedUser(deps);
    const transactionId = await newTransactionFor(deps, user.actor);

    const reply = await handleInboundWhatsAppImage(deps, {
      from: user.phone,
      buffer: new Uint8Array([1, 2, 3]),
      mimeType: "image/png",
    });
    expect(reply.body).toContain("Comprovante anexado");

    const tx = await deps.repos.transaction.findInWorkspace(user.actor.workspaceId, transactionId);
    expect(tx?.attachmentKey).not.toBeNull();
    expect(tx?.attachmentKey?.endsWith(".png")).toBe(true);
  });

  test("tipo de arquivo inválido é recusado com mensagem clara", async () => {
    const deps = createTestDeps(db);
    const user = await newLinkedUser(deps);
    const transactionId = await newTransactionFor(deps, user.actor);

    const reply = await handleInboundWhatsAppImage(deps, {
      from: user.phone,
      buffer: new Uint8Array([1]),
      mimeType: "application/pdf",
    });
    expect(reply.body).toContain("não é aceito");

    const tx = await deps.repos.transaction.findInWorkspace(user.actor.workspaceId, transactionId);
    expect(tx?.attachmentKey).toBeNull();
  });

  test("transação fora da janela de 5 minutos não recebe o anexo", async () => {
    const deps = createTestDeps(db);
    const user = await newLinkedUser(deps);
    const transactionId = await newTransactionFor(deps, user.actor);

    // Força a transação a parecer antiga (fora da janela de associação).
    await db
      .update(transactions)
      .set({ createdAt: new Date(Date.now() - 10 * 60_000) })
      .where(eq(transactions.id, transactionId));

    const reply = await handleInboundWhatsAppImage(deps, {
      from: user.phone,
      buffer: new Uint8Array([1]),
      mimeType: "image/jpeg",
    });
    expect(reply.body).toContain("Não encontrei nenhuma transação recente");
  });

  test("segunda foto substitui a primeira (sem lógica especial de 'duas fotos')", async () => {
    const deps = createTestDeps(db);
    const user = await newLinkedUser(deps);
    const transactionId = await newTransactionFor(deps, user.actor);

    await handleInboundWhatsAppImage(deps, { from: user.phone, buffer: new Uint8Array([1]), mimeType: "image/jpeg" });
    const afterFirst = await deps.repos.transaction.findInWorkspace(user.actor.workspaceId, transactionId);
    const firstKey = afterFirst?.attachmentKey;

    await handleInboundWhatsAppImage(deps, { from: user.phone, buffer: new Uint8Array([2]), mimeType: "image/webp" });
    const afterSecond = await deps.repos.transaction.findInWorkspace(user.actor.workspaceId, transactionId);

    expect(afterSecond?.attachmentKey).not.toBe(firstKey);
    expect(afterSecond?.attachmentKey?.endsWith(".webp")).toBe(true);
    // A key antiga não existe mais no storage.
    await expect(deps.storage.getSignedReadUrl(firstKey!, 60)).rejects.toThrow();
  });
});
