import { Elysia } from "elysia";
import { createSplit } from "../../../../application/use-cases/split";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateBody, validateParams } from "../../../validate";
import { createSplitSchema, workspaceTransactionParamsSchema } from "../schemas";
import { SPLIT_ERRORS } from "../errors";

export const createSplitRoute = (deps: AppDeps) =>
  new Elysia().post(
    "/workspaces/:workspaceId/transactions/:transactionId/split",
    async ({ request, params, body, set }) => {
      const p = validateParams(workspaceTransactionParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(createSplitSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await createSplit(deps, auth.value, p.value.transactionId, input.value);
      return respond(set, result, SPLIT_ERRORS, 201);
    },
  );
