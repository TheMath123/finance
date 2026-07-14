import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse, parseParams, requireRole } from "../../../lib/http";
import { cardParamsSchema, updateCardSchema } from "../schemas";
import { CARD_ERRORS } from "../errors";
import { updateCard } from "../services/update-card";

export const updateCardRoute = (deps: AppDeps) =>
  new Elysia().patch(
    "/workspaces/:workspaceId/cards/:cardId",
    async ({ request, params, body, set }) => {
      const p = parseParams(cardParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(updateCardSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updateCard(deps, auth.value, p.value.cardId, input.value);
      if (!result.ok) return fail(set, CARD_ERRORS[result.error]);
      return result.value;
    },
  );
