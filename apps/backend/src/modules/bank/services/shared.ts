import { and, eq } from "drizzle-orm";
import { banks, type Bank, type Db } from "@finance/db";

export async function findWorkspaceBank(
  db: Db,
  workspaceId: string,
  bankId: string,
): Promise<Bank | undefined> {
  return db.query.banks.findFirst({
    where: and(eq(banks.id, bankId), eq(banks.workspaceId, workspaceId)),
  });
}
