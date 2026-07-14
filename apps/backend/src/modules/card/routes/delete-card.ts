import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parseParams, requireRole } from "../../../lib/http";
import { cardParamsSchema } from "../schemas";
import { CARD_ERRORS } from "../errors";
import { deleteCard } from "../services/delete-card";

export const deleteCardRoute = (deps: AppDeps) =>
  new Elysia().delete(
    "/workspaces/:workspaceId/cards/:cardId",
    async ({ request, params, set }) => {
      const p = parseParams(cardParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await deleteCard(deps, auth.value, p.value.cardId);
      if (!result.ok) return fail(set, CARD_ERRORS[result.error]);
      set.status = 204;
    },
  );
