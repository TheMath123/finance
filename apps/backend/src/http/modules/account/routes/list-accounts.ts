import { Elysia } from "elysia";
import { listAccounts } from "../../../../application/use-cases/account";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateParams } from "../../../validate";
import { workspaceParamsSchema } from "../schemas";

export const listAccountsRoute = (deps: AppDeps) =>
  new Elysia().get("/workspaces/:workspaceId/accounts", async ({ request, params, set }) => {
    const p = validateParams(workspaceParamsSchema, params);
    if (!p.ok) return fail(set, p.error);
    const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "viewer");
    if (!auth.ok) return fail(set, auth.error);
    return listAccounts(deps, auth.value);
  });
