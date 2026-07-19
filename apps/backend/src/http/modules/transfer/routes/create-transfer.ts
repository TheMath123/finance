import { Elysia } from "elysia";
import { createTransfer } from "../../../../application/use-cases/transfer";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateBody, validateParams } from "../../../validate";
import { createTransferSchema, workspaceParamsSchema } from "../schemas";
import { TRANSFER_ERRORS } from "../errors";

export const createTransferRoute = (deps: AppDeps) =>
  new Elysia().post(
    "/workspaces/:workspaceId/transfers",
    async ({ request, params, body, set }) => {
      const p = validateParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(createTransferSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await createTransfer(deps, auth.value, input.value);
      return respond(set, result, TRANSFER_ERRORS, 201);
    },
  );
