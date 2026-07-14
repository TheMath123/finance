import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse } from "../../../lib/http";
import { verifyEmailSchema } from "../schemas";
import { AUTH_ERRORS } from "../errors";
import { verifyEmail } from "../services/verify-email";

export const verifyEmailRoute = (deps: AppDeps) =>
  new Elysia().post("/verify-email", async ({ body, set }) => {
    const input = parse(verifyEmailSchema, body);
    if (!input.ok) return fail(set, input.error);
    const result = await verifyEmail(deps, input.value);
    if (!result.ok) return fail(set, AUTH_ERRORS[result.error]);
    return { message: "E-mail verificado." };
  });
