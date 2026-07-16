import { Elysia } from "elysia";
import { listMyInvites } from "../../../../application/use-cases/workspace";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";

export const listMyInvitesRoute = (deps: AppDeps) =>
  new Elysia().get("/invites", async ({ request, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    return listMyInvites(deps, auth.value.userId);
  });
