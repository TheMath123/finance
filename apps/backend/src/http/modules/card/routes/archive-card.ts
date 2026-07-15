import { Elysia } from "elysia";
import { archiveCard } from "../../../../application/use-cases/card";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateParams } from "../../../validate";
import { cardParamsSchema } from "../schemas";
import { CARD_ERRORS } from "../errors";

export const archiveCardRoute = (deps: AppDeps) =>
  new Elysia()
    .post("/workspaces/:workspaceId/cards/:cardId/archive", async ({ request, params, set }) => {
      const p = validateParams(cardParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await archiveCard(deps, auth.value, p.value.cardId, true);
      return respond(set, result, CARD_ERRORS);
    })
    .post("/workspaces/:workspaceId/cards/:cardId/unarchive", async ({ request, params, set }) => {
      const p = validateParams(cardParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await archiveCard(deps, auth.value, p.value.cardId, false);
      return respond(set, result, CARD_ERRORS);
    });
