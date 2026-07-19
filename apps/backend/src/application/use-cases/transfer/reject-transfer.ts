import { left, right, type Either } from "@finance/shared";
import type { InterUserTransfer } from "../../../domain/entities/inter-user-transfer";
import type { UseCaseDeps } from "../../deps";
import type { TransferError } from "./errors";

export async function rejectTransfer(
  deps: Pick<UseCaseDeps, "repos">,
  actor: { userId: string },
  transferId: string,
): Promise<Either<TransferError, InterUserTransfer>> {
  const transfer = await deps.repos.interUserTransfer.findById(transferId);
  if (!transfer) return left("transfer_not_found");
  if (transfer.toUserId !== actor.userId) return left("not_recipient");
  if (transfer.status !== "pending") return left("already_finalized");

  const rejected = await deps.repos.interUserTransfer.reject(transferId);
  return right(rejected);
}
