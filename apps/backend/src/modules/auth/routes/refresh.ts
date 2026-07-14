import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse } from "../../../lib/http";
import { refreshSchema } from "../schemas";
import { AUTH_ERRORS } from "../errors";
import { refresh } from "../services/refresh";

export const refreshRoute = (deps: AppDeps) =>
  new Elysia().post("/refresh", async ({ body, set }) => {
    const input = parse(refreshSchema, body);
    if (!input.ok) return fail(set, input.error);
    const result = await refresh(deps, input.value);
    if (!result.ok) return fail(set, AUTH_ERRORS[result.error]);
    return result.value;
  });
