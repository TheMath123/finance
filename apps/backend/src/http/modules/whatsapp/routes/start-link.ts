import { Elysia } from "elysia";
import { startWhatsAppLink } from "../../../../application/use-cases/whatsapp";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";
import { WHATSAPP_ERRORS } from "../errors";

export const startWhatsAppLinkRoute = (deps: AppDeps) =>
  new Elysia().post("/whatsapp/link/start", async ({ request, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    const result = await startWhatsAppLink(deps, auth.value.userId);
    return respond(set, result, WHATSAPP_ERRORS);
  });
