/**
 * Testes das regras de negócio financeiras (spec) contra o Postgres local:
 * competência de fatura, parcelamento, saldo derivado, transferência neutra,
 * imutabilidade pós-pagamento, reatribuição de categoria e auditoria.
 */
import { beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import {
  DEFAULT_CATEGORIES,
  auditLogs,
  bankAccounts,
  banks,
  cards,
  categories,
  transactions,
  users,
  workspaceMembers,
  workspaces,
  type Db,
} from "@finance/db";
import { createDb } from "@finance/db";
import type { Actor } from "../../deps";
import { competencePeriod, splitInstallments } from "../../../domain/services/invoice-rules";
import { createTestDeps } from "../../../test/deps";
import { createTransaction } from "./create-transaction";
import { updateTransaction } from "./update-transaction";
import { deleteTransaction } from "./delete-transaction";
import { listInvoices } from "../card/list-invoices";
import { payInvoice } from "../card/pay-invoice";
import { deleteCategory } from "../category/delete-category";
import type { UseCaseDeps } from "../../deps";

let db: Db;
let deps: UseCaseDeps;
let actor: Actor;
let accountId: string;
let secondAccountId: string;
let cardId: string;
let categoryId: string;
let fallbackCategoryId: string;

async function accountBalance(accountId: string): Promise<number> {
  const account = await deps.repos.account.findInWorkspace(actor.workspaceId, accountId);
  if (!account) throw new Error("conta não encontrada");
  return account.initialBalance + (await deps.repos.transaction.balanceDelta(accountId));
}

/** Cenário base: workspace com conta (saldo inicial 1000,00), segunda conta, cartão fechando dia 10. */
beforeAll(async () => {
  db = createDb();
  deps = createTestDeps(db);
  const [user] = await db
    .insert(users)
    .values({
      name: "Dono",
      email: `domain-${crypto.randomUUID()}@test.local`,
      passwordHash: "x",
      termsAcceptedAt: new Date(),
      termsVersion: "test",
    })
    .returning();
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: "Domínio", type: "personal" })
    .returning();
  if (!user || !workspace) throw new Error("setup falhou");
  await db
    .insert(workspaceMembers)
    .values({ workspaceId: workspace.id, userId: user.id, role: "owner" });

  const inserted = await db
    .insert(categories)
    .values(
      DEFAULT_CATEGORIES.map((c) => ({
        workspaceId: workspace.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        isFallback: c.isFallback ?? false,
      })),
    )
    .returning();
  categoryId = inserted.find((c) => c.name === "Mercado")!.id;
  fallbackCategoryId = inserted.find((c) => c.isFallback)!.id;

  const [bank] = await db
    .insert(banks)
    .values({ workspaceId: workspace.id, name: "Nubank", bankCode: "nubank" })
    .returning();
  const [account] = await db
    .insert(bankAccounts)
    .values({
      workspaceId: workspace.id,
      bankId: bank!.id,
      name: "Principal",
      type: "checking",
      initialBalance: 100_000,
    })
    .returning();
  const [second] = await db
    .insert(bankAccounts)
    .values({
      workspaceId: workspace.id,
      bankId: bank!.id,
      name: "Reserva",
      type: "savings",
      initialBalance: 0,
    })
    .returning();
  const [card] = await db
    .insert(cards)
    .values({
      workspaceId: workspace.id,
      bankId: bank!.id,
      name: "Ultravioleta",
      limit: 500_000,
      closingDay: 10,
      dueDay: 17,
    })
    .returning();

  accountId = account!.id;
  secondAccountId = second!.id;
  cardId = card!.id;
  actor = { userId: user.id, workspaceId: workspace.id, role: "owner" };
});

describe("competência e parcelas (unidade)", () => {
  test("dia ≤ closing_day cai no mês; depois vai para o mês seguinte (com virada de ano)", () => {
    expect(competencePeriod("2026-07-10", 10)).toEqual({ month: 7, year: 2026 });
    expect(competencePeriod("2026-07-11", 10)).toEqual({ month: 8, year: 2026 });
    expect(competencePeriod("2026-12-25", 10)).toEqual({ month: 1, year: 2027 });
  });

  test("parcelas somam exatamente o total; resto na primeira", () => {
    expect(splitInstallments(90_000, 3)).toEqual([30_000, 30_000, 30_000]);
    expect(splitInstallments(10_000, 3)).toEqual([3_334, 3_333, 3_333]);
    expect(splitInstallments(10_000, 3).reduce((a, b) => a + b)).toBe(10_000);
  });
});

describe("transações e saldo derivado", () => {
  test("receita/despesa afetam o saldo; transferência é neutra entre contas", async () => {
    // receita 500,00 + despesa 120,00 na conta principal
    expect(
      (
        await createTransaction(deps, actor, {
          description: "Freela",
          amount: 50_000,
          type: "income",
          method: "pix",
          date: "2026-07-05",
          categoryId,
          accountId,
        })
      ).ok,
    ).toBe(true);
    expect(
      (
        await createTransaction(deps, actor, {
          description: "Mercado",
          amount: 12_000,
          type: "expense",
          method: "debit",
          date: "2026-07-06",
          categoryId,
          accountId,
        })
      ).ok,
    ).toBe(true);
    // transfere 200,00 para a reserva
    expect(
      (
        await createTransaction(deps, actor, {
          description: "Guardar dinheiro",
          amount: 20_000,
          type: "expense",
          method: "transfer",
          date: "2026-07-07",
          categoryId,
          accountId,
          toAccountId: secondAccountId,
        })
      ).ok,
    ).toBe(true);

    // 1000 + 500 − 120 − 200 = 1180,00
    expect(await accountBalance(accountId)).toBe(118_000);
    // reserva recebeu 200,00
    expect(await accountBalance(secondAccountId)).toBe(20_000);
  });

  test("validações de método: transfer sem destino e credit com conta falham", async () => {
    const noDest = await createTransaction(deps, actor, {
      description: "x",
      amount: 100,
      type: "expense",
      method: "transfer",
      date: "2026-07-07",
      categoryId,
      accountId,
    });
    expect(noDest.ok).toBe(false);

    const creditWithAccount = await createTransaction(deps, actor, {
      description: "x",
      amount: 100,
      type: "expense",
      method: "credit",
      date: "2026-07-07",
      categoryId,
      cardId,
      accountId,
    });
    expect(creditWithAccount.ok).toBe(false);
  });

  test("mutações geram AuditLog", async () => {
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.workspaceId, actor.workspaceId));
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.every((l) => l.userId === actor.userId)).toBe(true);
  });
});

describe("crédito, fatura e pagamento", () => {
  test("parcelada 3x cria 3 transações em faturas consecutivas somando o total", async () => {
    const result = await createTransaction(deps, actor, {
      description: "Notebook",
      amount: 100_000,
      type: "expense",
      method: "credit",
      date: "2026-07-05", // dia 5 ≤ closing 10 → fatura 07/2026
      categoryId,
      cardId,
      installments: 3,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(3);
    expect(result.value.reduce((sum, t) => sum + t.amount, 0)).toBe(100_000);
    // faturas distintas e consecutivas
    const invoiceIds = new Set(result.value.map((t) => t.invoiceId));
    expect(invoiceIds.size).toBe(3);

    const invoices = await listInvoices(deps, actor, cardId);
    expect(invoices.ok).toBe(true);
    if (!invoices.ok) return;
    const periods = invoices.value.map((i) => `${i.monthReference}/${i.yearReference}`);
    expect(periods).toContain("7/2026");
    expect(periods).toContain("8/2026");
    expect(periods).toContain("9/2026");
  });

  test("pagar fatura cria transação de despesa na conta e marca paid; transação da fatura fica imutável", async () => {
    const invoices = await listInvoices(deps, actor, cardId);
    if (!invoices.ok) throw new Error("listagem falhou");
    const july = invoices.value.find((i) => i.monthReference === 7 && i.yearReference === 2026);
    if (!july) throw new Error("fatura 07/2026 não encontrada");
    // 1ª parcela leva o resto: 33.334
    expect(july.total).toBe(33_334);

    const balanceBefore = await accountBalance(accountId);
    const paid = await payInvoice(deps, actor, july.id, {
      accountId,
      date: "2026-07-17",
      method: "pix",
    });
    expect(paid.ok).toBe(true);

    // o pagamento saiu da conta
    expect(await accountBalance(accountId)).toBe(balanceBefore - 33_334);

    // pagar de novo falha
    const again = await payInvoice(deps, actor, july.id, {
      accountId,
      date: "2026-07-18",
      method: "pix",
    });
    expect(again.ok).toBe(false);

    // transação de fatura paga é imutável (update e delete)
    const txInPaid = (await db.query.transactions.findMany()).find(
      (t) => t.invoiceId === july.id && t.method === "credit",
    );
    if (!txInPaid) throw new Error("parcela da fatura paga não encontrada");
    const upd = await updateTransaction(deps, actor, txInPaid.id, { description: "hack" });
    expect(upd.ok).toBe(false);
    const del = await deleteTransaction(deps, actor, txInPaid.id);
    expect(del.ok).toBe(false);
  });

  test("excluir parcelada remove só as parcelas de faturas não pagas", async () => {
    // parcela 2 (fatura 08, não paga) — excluir a partir dela
    const all = await db.query.transactions.findMany();
    const parcel2 = all.find(
      (t) => t.installmentNumber === 2 && t.description === "Notebook" && !t.deletedAt,
    );
    if (!parcel2) throw new Error("parcela 2 não encontrada");

    const result = await deleteTransaction(deps, actor, parcel2.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // exclui parcelas 2 e 3 (faturas 08 e 09) — a 1 está em fatura paga e permanece
    expect(result.value.deletedIds).toHaveLength(2);

    const after = await db.query.transactions.findMany();
    const parcel1 = after.find((t) => t.installmentNumber === 1 && t.description === "Notebook");
    expect(parcel1?.deletedAt).toBeNull();
  });
});

describe("categorias", () => {
  test("excluir categoria em uso reatribui transações para a fallback; fallback não é deletável", async () => {
    const [temp] = await db
      .insert(categories)
      .values({ workspaceId: actor.workspaceId, name: "Temp", icon: "x", color: "#000000" })
      .returning();
    if (!temp) throw new Error("categoria temp não criada");

    const created = await createTransaction(deps, actor, {
      description: "Compra temp",
      amount: 5_000,
      type: "expense",
      method: "debit",
      date: "2026-07-08",
      categoryId: temp.id,
      accountId,
    });
    if (!created.ok) throw new Error("transação temp não criada");

    const del = await deleteCategory(deps, actor, temp.id);
    expect(del.ok).toBe(true);

    // recarrega a transação e confere a reatribuição para a fallback
    const reloaded = await db.query.transactions.findFirst({
      where: eq(transactions.id, created.value[0]!.id),
    });
    expect(reloaded?.categoryId).toBe(fallbackCategoryId);

    const fallbackDelete = await deleteCategory(deps, actor, fallbackCategoryId);
    expect(fallbackDelete.ok).toBe(false);
  });
});
