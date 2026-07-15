import { Elysia } from "elysia";
import { updateCard } from "../../../../application/use-cases/card";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateBody, validateParams } from "../../../validate";
import { cardParamsSchema, updateCardSchema } from "../schemas";
import { CARD_ERRORS } from "../errors";

export const updateCardRoute = (deps: AppDeps) =>
  new Elysia().patch(
    "/workspaces/:workspaceId/cards/:cardId",
    async ({ request, params, body, set }) => {
      const p = validateParams(cardParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(updateCardSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updateCard(deps, auth.value, p.value.cardId, input.value);
      return respond(set, result, CARD_ERRORS);
    },
  );
