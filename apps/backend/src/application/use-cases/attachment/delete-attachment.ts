import { left, right, type Either } from "@finance/shared";
import type { Actor, UseCaseDeps } from "../../deps";
import type { AttachmentError } from "./errors";

/** Remove o anexo, nunca a transação. */
export async function deleteAttachment(
  deps: Pick<UseCaseDeps, "repos" | "storage">,
  actor: Actor,
  transactionId: string,
): Promise<Either<AttachmentError, null>> {
  const transaction = await deps.repos.transaction.findInWorkspace(actor.workspaceId, transactionId);
  if (!transaction) return left("transaction_not_found");
  if (!transaction.attachmentKey) return left("attachment_not_found");

  await deps.storage.delete(transaction.attachmentKey);
  await deps.repos.transaction.update(transactionId, { attachmentKey: null });

  return right(null);
}
