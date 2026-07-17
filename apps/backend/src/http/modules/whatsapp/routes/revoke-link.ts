import { Elysia } from "elysia";
import { revokeWhatsAppLink } from "../../../../application/use-cases/whatsapp";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";

export const revokeWhatsAppLinkRoute = (deps: AppDeps) =>
  new Elysia().delete("/whatsapp/link", async ({ request, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    await revokeWhatsAppLink(deps, auth.value.userId);
    set.status = 204;
  });
