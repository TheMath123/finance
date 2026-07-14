import { and, eq } from "drizzle-orm";
import { bankAccounts, type BankAccount, type Db } from "@finance/db";

export async function findWorkspaceAccount(
  db: Db,
  workspaceId: string,
  accountId: string,
): Promise<BankAccount | undefined> {
  return db.query.bankAccounts.findFirst({
    where: and(eq(bankAccounts.id, accountId), eq(bankAccounts.workspaceId, workspaceId)),
  });
}
