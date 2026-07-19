import type { UseCaseDeps } from "../../deps";

export interface TransferAccountOption {
  accountId: string;
  accountName: string;
  workspaceId: string;
  workspaceName: string;
}

/** Contas do destinatário em qualquer workspace seu — escolha de onde a entrada cai no aceite (M3-02). */
export async function listTransferAccounts(
  deps: Pick<UseCaseDeps, "repos">,
  actor: { userId: string },
): Promise<TransferAccountOption[]> {
  const rows = await deps.repos.account.listActiveForUser(actor.userId);
  return rows.map((row) => ({
    accountId: row.account.id,
    accountName: row.account.name,
    workspaceId: row.workspaceId,
    workspaceName: row.workspaceName,
  }));
}
