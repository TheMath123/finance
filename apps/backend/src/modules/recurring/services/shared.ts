import { and, eq } from "drizzle-orm";
import {
  bankAccounts,
  cards,
  categories,
  recurringTransactions,
  type Db,
  type RecurringTransaction,
} from "@finance/db";
import type { RecurringError } from "../errors";
import type { RecurringInput } from "../schemas";

export async function findWorkspaceRecurring(
  db: Db,
  workspaceId: string,
  recurringId: string,
): Promise<RecurringTransaction | undefined> {
  return db.query.recurringTransactions.findFirst({
    where: and(
      eq(recurringTransactions.id, recurringId),
      eq(recurringTransactions.workspaceId, workspaceId),
    ),
  });
}

export function validateRule(
  input: Pick<RecurringInput, "frequency" | "dayOfReference" | "monthOfReference">,
): boolean {
  if (input.frequency === "weekly") {
    return input.dayOfReference >= 0 && input.dayOfReference <= 6 && input.monthOfReference == null;
  }
  if (input.dayOfReference < 1 || input.dayOfReference > 31) return false;
  if (input.frequency === "yearly") {
    return (
      input.monthOfReference != null && input.monthOfReference >= 1 && input.monthOfReference <= 12
    );
  }
  return input.monthOfReference == null;
}

export async function validateRefs(
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
