import { and, eq, inArray } from "drizzle-orm";
import {
  bankAccounts,
  banks,
  cards,
  categories,
  recurringTransactions,
  transactions,
  type Db,
  type RecurringTransaction,
  type Transaction,
} from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import type { RecurrenceFrequency, TransactionType } from "@finance/shared";
import { recordAudit } from "../../lib/audit";
import type { Actor } from "../../lib/http";
import { occurrencesInMonth } from "../../lib/occurrences";
import { createTransaction, type TransactionError } from "../transaction/service";

export type RecurringError =
  | "recurring_not_found"
  | "category_not_found"
  | "account_not_found"
  | "card_not_found"
  | "invalid_method_fields"
  | "invalid_rule"
  | "occurrence_already_confirmed"
  | "not_an_occurrence"
  | TransactionError;

export interface RecurringDeps {
  db: Db;
}

export interface RecurringInput {
  description: string;
  amount: number;
  type: TransactionType;
  /** Transferência recorrente fica fora do M1 (schema não tem conta destino). */
  method: "pix" | "debit" | "cash" | "credit";
  categoryId: string;
  accountId?: string;
  cardId?: string;
  frequency: RecurrenceFrequency;
  dayOfReference: number;
  monthOfReference?: number;
  active?: boolean;
}

function validateRule(input: Pick<RecurringInput, "frequency" | "dayOfReference" | "monthOfReference">): boolean {
  if (input.frequency === "weekly") {
    return input.dayOfReference >= 0 && input.dayOfReference <= 6 && input.monthOfReference == null;
  }
  if (input.dayOfReference < 1 || input.dayOfReference > 31) return false;
  if (input.frequency === "yearly") {
    return input.monthOfReference != null && input.monthOfReference >= 1 && input.monthOfReference <= 12;
  }
  return input.monthOfReference == null;
}

async function validateRefs(
  db: Db,
  workspaceId: string,
  input: Pick<RecurringInput, "method" | "categoryId" | "accountId" | "cardId">,
): Promise<RecurringError | null> {
  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, input.categoryId), eq(categories.workspaceId, workspaceId)),
  });
  if (!category) return "category_not_found";

  if (input.method === "credit") {
    if (!input.cardId || input.accountId) return "invalid_method_fields";
    const card = await db.query.cards.findFirst({
      where: and(eq(cards.id, input.cardId), eq(cards.workspaceId, workspaceId)),
    });
    if (!card) return "card_not_found";
  } else {
    if (!input.accountId || input.cardId) return "invalid_method_fields";
    const account = await db.query.bankAccounts.findFirst({
      where: and(eq(bankAccounts.id, input.accountId), eq(bankAccounts.workspaceId, workspaceId)),
    });
    if (!account) return "account_not_found";
  }
  return null;
}

export async function createRecurring(
  deps: RecurringDeps,
  actor: Actor,
  input: RecurringInput,
): Promise<Either<RecurringError, RecurringTransaction>> {
  if (!validateRule(input)) return left("invalid_rule");
  const refError = await validateRefs(deps.db, actor.workspaceId, input);
  if (refError) return left(refError);

  const created = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .insert(recurringTransactions)
      .values({ ...input, workspaceId: actor.workspaceId })
      .returning();
    if (!row) throw new Error("falha ao criar recorrência");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "create",
      entity: "recurring_transaction",
      entityId: row.id,
    });
    return row;
  });
  return right(created);
}

export async function listRecurring(
  deps: RecurringDeps,
  actor: Actor,
): Promise<RecurringTransaction[]> {
  return deps.db.query.recurringTransactions.findMany({
    where: eq(recurringTransactions.workspaceId, actor.workspaceId),
  });
}

export async function updateRecurring(
  deps: RecurringDeps,
  actor: Actor,
  recurringId: string,
  input: Partial<RecurringInput>,
): Promise<Either<RecurringError, RecurringTransaction>> {
  const existing = await deps.db.query.recurringTransactions.findFirst({
    where: and(
      eq(recurringTransactions.id, recurringId),
      eq(recurringTransactions.workspaceId, actor.workspaceId),
    ),
  });
  if (!existing) return left("recurring_not_found");

  const merged = { ...existing, ...input };
  if (
    !validateRule({
      frequency: merged.frequency,
      dayOfReference: merged.dayOfReference,
      monthOfReference: merged.monthOfReference ?? undefined,
    })
  ) {
    return left("invalid_rule");
  }
  const refError = await validateRefs(deps.db, actor.workspaceId, {
    method: merged.method as RecurringInput["method"],
    categoryId: merged.categoryId,
    accountId: merged.accountId ?? undefined,
    cardId: merged.cardId ?? undefined,
  });
  if (refError) return left(refError);

  const updated = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .update(recurringTransactions)
      .set(input)
      .where(eq(recurringTransactions.id, recurringId))
      .returning();
    if (!row) throw new Error("falha ao atualizar recorrência");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "update",
      entity: "recurring_transaction",
      entityId: row.id,
    });
    return row;
  });
  return right(updated);
}

export async function deleteRecurring(
  deps: RecurringDeps,
  actor: Actor,
  recurringId: string,
): Promise<Either<RecurringError, null>> {
  const existing = await deps.db.query.recurringTransactions.findFirst({
    where: and(
      eq(recurringTransactions.id, recurringId),
      eq(recurringTransactions.workspaceId, actor.workspaceId),
    ),
  });
  if (!existing) return left("recurring_not_found");

  // FK das transações já lançadas tem onDelete: set null — histórico preservado
  await deps.db.transaction(async (tx) => {
    await tx.delete(recurringTransactions).where(eq(recurringTransactions.id, recurringId));
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "delete",
      entity: "recurring_transaction",
      entityId: recurringId,
    });
  });
  return right(null);
}

export interface PendingOccurrence {
  recurringId: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  method: RecurringInput["method"];
  categoryId: string;
  accountId: string | null;
  cardId: string | null;
}

/**
 * Ocorrências previstas do mês ainda não confirmadas (regra do spec, M1):
 * a recorrência aparece como prevista e o app oferece confirmar com um toque.
 * Confirmada = existe transação com (recurring_id, date) — soft-deletadas contam
 * (excluir o lançamento não faz a sugestão voltar).
 */
export async function listPendingOccurrences(
  deps: RecurringDeps,
  actor: Actor,
  year: number,
  month: number,
): Promise<PendingOccurrence[]> {
  const rules = await deps.db.query.recurringTransactions.findMany({
    where: and(
      eq(recurringTransactions.workspaceId, actor.workspaceId),
      eq(recurringTransactions.active, true),
    ),
  });
  if (rules.length === 0) return [];

  const confirmed = await deps.db
    .select({ recurringId: transactions.recurringId, date: transactions.date })
    .from(transactions)
    .where(
      inArray(
        transactions.recurringId,
        rules.map((r) => r.id),
      ),
    );
  const confirmedKeys = new Set(confirmed.map((c) => `${c.recurringId}:${c.date}`));

  const pending: PendingOccurrence[] = [];
  for (const rule of rules) {
    for (const date of occurrencesInMonth(rule, year, month)) {
      if (confirmedKeys.has(`${rule.id}:${date}`)) continue;
      pending.push({
        recurringId: rule.id,
        date,
        description: rule.description,
        amount: rule.amount,
        type: rule.type,
        method: rule.method as RecurringInput["method"],
        categoryId: rule.categoryId,
        accountId: rule.accountId,
        cardId: rule.cardId,
      });
    }
  }
  return pending.sort((a, b) => a.date.localeCompare(b.date));
}

/** Confirmação com um toque: materializa a ocorrência como transação real. */
export async function confirmOccurrence(
  deps: RecurringDeps,
  actor: Actor,
  recurringId: string,
  date: string,
): Promise<Either<RecurringError, Transaction[]>> {
  const rule = await deps.db.query.recurringTransactions.findFirst({
    where: and(
      eq(recurringTransactions.id, recurringId),
      eq(recurringTransactions.workspaceId, actor.workspaceId),
    ),
  });
  if (!rule) return left("recurring_not_found");

  const [y, m] = date.split("-").map(Number) as [number, number];
  if (!occurrencesInMonth(rule, y, m).includes(date)) return left("not_an_occurrence");

  const existing = await deps.db.query.transactions.findFirst({
    where: and(eq(transactions.recurringId, recurringId), eq(transactions.date, date)),
  });
  if (existing) return left("occurrence_already_confirmed");

  return createTransaction(deps, actor, {
    description: rule.description,
    amount: rule.amount,
    type: rule.type,
    method: rule.method as RecurringInput["method"],
    date,
    categoryId: rule.categoryId,
    accountId: rule.accountId ?? undefined,
    cardId: rule.cardId ?? undefined,
    recurringId: rule.id,
  });
}
