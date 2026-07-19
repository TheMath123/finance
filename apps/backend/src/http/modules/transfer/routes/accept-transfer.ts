import { Elysia } from "elysia";
import { acceptTransfer } from "../../../../application/use-cases/transfer";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";
import { validateBody, validateParams } from "../../../validate";
import { acceptTransferSchema, transferParamsSchema } from "../schemas";
import { TRANSFER_ERRORS } from "../errors";

export const acceptTransferRoute = (deps: AppDeps) =>
  new Elysia().post("/transfers/:id/accept", async ({ request, params, body, set }) => {
    const p = validateParams(transferParamsSchema, params);
    if (!p.ok) return fail(set, p.error);
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    const input = validateBody(acceptTransferSchema, body);
    if (!input.ok) return fail(set, input.error);
    const result = await acceptTransfer(deps, auth.value, { transferId: p.value.id, ...input.value });
    return respond(set, result, TRANSFER_ERRORS);
  });
