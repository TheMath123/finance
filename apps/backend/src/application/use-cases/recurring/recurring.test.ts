/**
 * Testes de recorrências (previstas + confirmação com um toque) e da visão
 * mensal com projeção de disponível, contra o Postgres local.
 */
import { beforeAll, describe, expect, test } from "bun:test";
import {
  DEFAULT_CATEGORIES,
  bankAccounts,
  banks,
  categories,
  users,
  workspaceMembers,
  workspaces,
  type Db,
} from "@finance/db";
import { createDb } from "@finance/db";
import type { Actor, UseCaseDeps } from "../../deps";
import { occurrencesInMonth } from "../../../domain/services/occurrence-rules";
import { createTestDeps } from "../../../test/deps";
import { confirmOccurrence } from "./confirm-occurrence";
import { createRecurring } from "./create-recurring";
import { listPendingOccurrences } from "./list-pending-occurrences";
import { monthlySummary } from "../summary/monthly-summary";

let db: Db;
let deps: UseCaseDeps;
let actor: Actor;
let accountId: string;
let salaryCategoryId: string;
let housingCategoryId: string;

async function accountBalance(accountId: string): Promise<number> {
  const account = await deps.repos.account.findInWorkspace(actor.workspaceId, accountId);
  if (!account) throw new Error("conta não encontrada");
  return account.initialBalance + (await deps.repos.transaction.balanceDelta(accountId));
}

/** Datas do mês corrente (a projeção só existe para mês corrente/futuro). */
const now = new Date();
const YEAR = now.getFullYear();
const MONTH = now.getMonth() + 1;

beforeAll(async () => {
  db = createDb();
  deps = createTestDeps(db);
  const [user] = await db
    .insert(users)
    .values({
      name: "Recorrente",
      email: `recurring-${crypto.randomUUID()}@test.local`,
      passwordHash: "x",
      termsAcceptedAt: new Date(),
      termsVersion: "test",
    })
    .returning();
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: "Recorrências", type: "personal" })
    .returning();
  if (!user || !workspace) throw new Error("setup falhou");
  await db
    .insert(workspaceMembers)
    .values({ workspaceId: workspace.id, userId: user.id, role: "owner" });

  const cats = await db
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
  salaryCategoryId = cats.find((c) => c.name === "Salário")!.id;
  housingCategoryId = cats.find((c) => c.name === "Moradia")!.id;

  const [bank] = await db
    .insert(banks)
    .values({ workspaceId: workspace.id, name: "Inter", bankCode: "inter" })
    .returning();
  const [account] = await db
    .insert(bankAccounts)
    .values({
      workspaceId: workspace.id,
      bankId: bank!.id,
      name: "Conta",
      type: "checking",
      initialBalance: 50_000, // R$ 500,00
    })
    .returning();
  accountId = account!.id;
  actor = { userId: user.id, workspaceId: workspace.id, role: "owner" };
});

describe("ocorrências (unidade)", () => {
  test("monthly clampa dia 31 para o fim do mês curto", () => {
    expect(
      occurrencesInMonth({ frequency: "monthly", dayOfReference: 31, monthOfReference: null }, 2026, 2),
    ).toEqual(["2026-02-28"]);
  });

  test("yearly só ocorre no mês de referência", () => {
    const rule = { frequency: "yearly" as const, dayOfReference: 15, monthOfReference: 3 };
    expect(occurrencesInMonth(rule, 2026, 3)).toEqual(["2026-03-15"]);
    expect(occurrencesInMonth(rule, 2026, 4)).toEqual([]);
  });

  test("weekly retorna todas as semanas do mês naquele dia", () => {
    // Julho/2026: quartas-feiras (dia 3 da semana JS)
    const dates = occurrencesInMonth(
      { frequency: "weekly", dayOfReference: 3, monthOfReference: null },
      2026,
      7,
    );
    expect(dates).toEqual(["2026-07-01", "2026-07-08", "2026-07-15", "2026-07-22", "2026-07-29"]);
  });
});

describe("recorrências: previstas e confirmação", () => {
  test("fluxo: criar → aparece como prevista → confirmar → some da lista e vira transação", async () => {
    const created = await createRecurring(deps, actor, {
      description: "Salário",
      amount: 300_000, // R$ 3.000,00
      type: "income",
      method: "pix",
      categoryId: salaryCategoryId,
      accountId,
      frequency: "monthly",
      dayOfReference: 5,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const pending = await listPendingOccurrences(deps, actor, YEAR, MONTH);
    const salary = pending.find((p) => p.recurringId === created.value.id);
    expect(salary).toBeDefined();
    if (!salary) return;

    const balanceBefore = await accountBalance(accountId);
    const confirmed = await confirmOccurrence(deps, actor, created.value.id, salary.date);
    expect(confirmed.ok).toBe(true);

    // saldo derivado refletiu o lançamento
    expect(await accountBalance(accountId)).toBe(balanceBefore + 300_000);

    // some da lista de previstas
    const after = await listPendingOccurrences(deps, actor, YEAR, MONTH);
    expect(after.find((p) => p.recurringId === created.value.id)).toBeUndefined();

    // confirmar de novo falha
    const again = await confirmOccurrence(deps, actor, created.value.id, salary.date);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error).toBe("occurrence_already_confirmed");
  });

  test("regra inválida é rejeitada (yearly sem mês; weekly com dia 8)", async () => {
    const noMonth = await createRecurring(deps, actor, {
      description: "Anual",
      amount: 1000,
      type: "expense",
      method: "pix",
      categoryId: housingCategoryId,
      accountId,
      frequency: "yearly",
      dayOfReference: 10,
    });
    expect(noMonth.ok).toBe(false);

    const badWeekday = await createRecurring(deps, actor, {
      description: "Semanal",
      amount: 1000,
      type: "expense",
      method: "pix",
      categoryId: housingCategoryId,
      accountId,
      frequency: "weekly",
      dayOfReference: 8,
    });
    expect(badWeekday.ok).toBe(false);
  });
});

describe("visão mensal e projeção", () => {
  test("summary traz receitas/despesas do mês e projeção com recorrências previstas", async () => {
    // despesa recorrente ainda não confirmada: aluguel no último dia do mês
    const rent = await createRecurring(deps, actor, {
      description: "Aluguel",
      amount: 120_000, // R$ 1.200,00
      type: "expense",
      method: "pix",
      categoryId: housingCategoryId,
      accountId,
      frequency: "monthly",
      dayOfReference: 31, // clampa para o fim do mês — sempre à frente de hoje ou hoje
    });
    expect(rent.ok).toBe(true);

    const summary = await monthlySummary(deps, actor, YEAR, MONTH);

    // salário confirmado no teste anterior entra nas receitas do mês
    expect(summary.income).toBeGreaterThanOrEqual(300_000);
    // saldo total = 500 + 3000 = 3500,00
    expect(summary.totalBalance).toBe(350_000);
    // projeção existe para o mês corrente
    expect(summary.projectedAvailable).not.toBeNull();
    // aluguel previsto (não confirmado) abate a projeção se a ocorrência ainda não passou;
    // no pior caso (ocorrência já passada no mês), projeção = saldo total
    expect(summary.projectedAvailable!).toBeLessThanOrEqual(350_000);
    expect(summary.projectedAvailable!).toBeGreaterThanOrEqual(350_000 - 120_000);
  });
});
