import { Elysia } from "elysia";
import { deleteCard } from "../../../../application/use-cases/card";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateParams } from "../../../validate";
import { cardParamsSchema } from "../schemas";
import { CARD_ERRORS } from "../errors";

export const deleteCardRoute = (deps: AppDeps) =>
  new Elysia().delete(
    "/workspaces/:workspaceId/cards/:cardId",
    async ({ request, params, set }) => {
      const p = validateParams(cardParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await deleteCard(deps, auth.value, p.value.cardId);
      return respond(set, result, CARD_ERRORS, 204);
    },
  );
