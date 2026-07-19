/**
 * Testes de anexo de comprovante (M3-04) contra o Postgres local (storage in-memory).
 */
import { beforeAll, describe, expect, test } from "bun:test";
import { createDb, type Db } from "@finance/db";
import type { Actor } from "../../deps";
import { createTestDeps } from "../../../test/deps";
import { register } from "../auth";
import { createTransaction } from "../transaction";
import { deleteAttachment } from "./delete-attachment";
import { getAttachmentUrl } from "./get-attachment-url";
import { MAX_ATTACHMENT_SIZE_BYTES, uploadAttachment } from "./upload-attachment";

const uniqueEmail = () => `test-${crypto.randomUUID()}@test.local`;

let db: Db;

beforeAll(() => {
  db = createDb();
});

async function newActorWithTransaction(deps: ReturnType<typeof createTestDeps>): Promise<{
  actor: Actor;
  transactionId: string;
}> {
  const result = await register(deps, { name: "Dono", email: uniqueEmail(), password: "senha-forte-123" });
  if (!result.ok) throw new Error("falha ao registrar usuário de teste");
  const workspaceId = result.value.defaultWorkspaceId;
  const accounts = await deps.repos.account.listByWorkspace(workspaceId);
  const category = await deps.repos.category.findFallback(workspaceId);
  const account = accounts[0];
  if (!account || !category) throw new Error("workspace de teste sem conta/categoria padrão");

  const actor: Actor = { userId: result.value.user.id, workspaceId, role: "owner" };
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
  return { actor, transactionId: tx.value[0]!.id };
}

describe("uploadAttachment", () => {
  test("tipo de arquivo inválido é rejeitado", async () => {
    const deps = createTestDeps(db);
    const { actor, transactionId } = await newActorWithTransaction(deps);

    const result = await uploadAttachment(deps, actor, transactionId, {
      buffer: new Uint8Array([1, 2, 3]),
      contentType: "application/pdf",
      size: 3,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_file_type");
  });

  test("arquivo maior que o limite é rejeitado", async () => {
    const deps = createTestDeps(db);
    const { actor, transactionId } = await newActorWithTransaction(deps);

    const result = await uploadAttachment(deps, actor, transactionId, {
      buffer: new Uint8Array([1]),
      contentType: "image/jpeg",
      size: MAX_ATTACHMENT_SIZE_BYTES + 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("file_too_large");
  });

  test("transação inexistente é rejeitada", async () => {
    const deps = createTestDeps(db);
    const { actor } = await newActorWithTransaction(deps);

    const result = await uploadAttachment(deps, actor, crypto.randomUUID(), {
      buffer: new Uint8Array([1]),
      contentType: "image/jpeg",
      size: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("transaction_not_found");
  });

  test("upload válido grava a key e permite leitura via URL assinada", async () => {
    const deps = createTestDeps(db);
    const { actor, transactionId } = await newActorWithTransaction(deps);

    const uploaded = await uploadAttachment(deps, actor, transactionId, {
      buffer: new Uint8Array([1, 2, 3, 4]),
      contentType: "image/png",
      size: 4,
    });
    expect(uploaded.ok).toBe(true);
    if (!uploaded.ok) return;
    expect(uploaded.value.attachmentKey).toContain(actor.workspaceId);
    expect(uploaded.value.attachmentKey).toContain(transactionId);
    expect(uploaded.value.attachmentKey.endsWith(".png")).toBe(true);

    const urlResult = await getAttachmentUrl(deps, actor, transactionId);
    expect(urlResult.ok).toBe(true);
    if (urlResult.ok) expect(urlResult.value.url).toContain(uploaded.value.attachmentKey);
  });

  test("novo upload substitui o anexo anterior (não acumula lixo no storage)", async () => {
    const deps = createTestDeps(db);
    const { actor, transactionId } = await newActorWithTransaction(deps);

    const first = await uploadAttachment(deps, actor, transactionId, {
      buffer: new Uint8Array([1]),
      contentType: "image/jpeg",
      size: 1,
    });
    if (!first.ok) throw new Error("setup falhou");

    const second = await uploadAttachment(deps, actor, transactionId, {
      buffer: new Uint8Array([2]),
      contentType: "image/webp",
      size: 1,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.attachmentKey).not.toBe(first.value.attachmentKey);

    // A key antiga não existe mais no storage (foi deletada na substituição).
    await expect(deps.storage.getSignedReadUrl(first.value.attachmentKey, 60)).rejects.toThrow();
  });
});

describe("getAttachmentUrl / deleteAttachment", () => {
  test("erro quando não há anexo", async () => {
    const deps = createTestDeps(db);
    const { actor, transactionId } = await newActorWithTransaction(deps);

    const result = await getAttachmentUrl(deps, actor, transactionId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("attachment_not_found");
  });

  test("delete remove do storage e limpa a transação", async () => {
    const deps = createTestDeps(db);
    const { actor, transactionId } = await newActorWithTransaction(deps);

    const uploaded = await uploadAttachment(deps, actor, transactionId, {
      buffer: new Uint8Array([1]),
      contentType: "image/jpeg",
      size: 1,
    });
    if (!uploaded.ok) throw new Error("setup falhou");

    const deleted = await deleteAttachment(deps, actor, transactionId);
    expect(deleted.ok).toBe(true);

    const afterDelete = await getAttachmentUrl(deps, actor, transactionId);
    expect(afterDelete.ok).toBe(false);
    if (!afterDelete.ok) expect(afterDelete.error).toBe("attachment_not_found");

    const secondDelete = await deleteAttachment(deps, actor, transactionId);
    expect(secondDelete.ok).toBe(false);
    if (!secondDelete.ok) expect(secondDelete.error).toBe("attachment_not_found");
  });
});
