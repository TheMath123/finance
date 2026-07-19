import { Elysia } from "elysia";
import { listOwedByMe, listOwedToMe } from "../../../../application/use-cases/split";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";

export const listOwedByMeRoute = (deps: AppDeps) =>
  new Elysia().get("/splits/owed-by-me", async ({ request, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    return listOwedByMe(deps, auth.value);
  });

export const listOwedToMeRoute = (deps: AppDeps) =>
  new Elysia().get("/splits/owed-to-me", async ({ request, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    return listOwedToMe(deps, auth.value);
  });
