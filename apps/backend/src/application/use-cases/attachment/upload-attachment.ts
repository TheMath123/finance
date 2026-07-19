import { left, right, type Either } from "@finance/shared";
import type { Actor, UseCaseDeps } from "../../deps";
import type { AttachmentError } from "./errors";

/**
 * Só imagem por enquanto (jpg/png/webp) — PDF fica pra depois se virar
 * necessidade real (YAGNI, decisão de escopo M3-04). 5MB é o suficiente
 * pra foto de comprovante sem precisar de compressão client-side.
 */
const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;

export interface UploadAttachmentInput {
  buffer: Uint8Array;
  contentType: string;
  size: number;
}

export async function uploadAttachment(
  deps: Pick<UseCaseDeps, "repos" | "storage">,
  actor: Actor,
  transactionId: string,
  input: UploadAttachmentInput,
): Promise<Either<AttachmentError, { attachmentKey: string }>> {
  const ext = ALLOWED_CONTENT_TYPES[input.contentType];
  if (!ext) return left("invalid_file_type");
  if (input.size > MAX_ATTACHMENT_SIZE_BYTES) return left("file_too_large");

  const transaction = await deps.repos.transaction.findInWorkspace(actor.workspaceId, transactionId);
  if (!transaction) return left("transaction_not_found");

  // Substitui: nunca acumula lixo órfão no bucket se já tinha um anexo.
  if (transaction.attachmentKey) {
    await deps.storage.delete(transaction.attachmentKey);
  }

  const key = `${actor.workspaceId}/${transactionId}/${crypto.randomUUID()}.${ext}`;
  await deps.storage.upload(key, input.buffer, input.contentType);
  await deps.repos.transaction.update(transactionId, { attachmentKey: key });

  return right({ attachmentKey: key });
}
