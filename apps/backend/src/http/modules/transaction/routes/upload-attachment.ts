import { Elysia } from "elysia";
import { uploadAttachment } from "../../../../application/use-cases/attachment";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateParams } from "../../../validate";
import { transactionParamsSchema } from "../schemas";
import { ATTACHMENT_ERRORS } from "../errors";

export const uploadAttachmentRoute = (deps: AppDeps) =>
  new Elysia().post(
    "/workspaces/:workspaceId/transactions/:transactionId/attachment",
    async ({ request, params, set }) => {
      const p = validateParams(transactionParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);

      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return fail(set, { status: 400, code: "validation_error", message: "Arquivo não enviado." });
      }

      const buffer = new Uint8Array(await file.arrayBuffer());
      const result = await uploadAttachment(deps, auth.value, p.value.transactionId, {
        buffer,
        contentType: file.type,
        size: buffer.byteLength,
      });
      return respond(set, result, ATTACHMENT_ERRORS, 200);
    },
  );
