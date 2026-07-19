import { Elysia } from "elysia";
import { cancelSplit } from "../../../../application/use-cases/split";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";
import { validateParams } from "../../../validate";
import { splitParamsSchema } from "../schemas";
import { SPLIT_ERRORS } from "../errors";

export const cancelSplitRoute = (deps: AppDeps) =>
  new Elysia().post("/splits/:id/cancel", async ({ request, params, set }) => {
    const p = validateParams(splitParamsSchema, params);
    if (!p.ok) return fail(set, p.error);
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    const result = await cancelSplit(deps, auth.value, p.value.id);
    return respond(set, result, SPLIT_ERRORS);
  });
