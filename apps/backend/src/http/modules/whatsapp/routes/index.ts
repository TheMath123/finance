import { Elysia } from "elysia";
import type { AppDeps } from "../../../deps";
import { startWhatsAppLinkRoute } from "./start-link";
import { revokeWhatsAppLinkRoute } from "./revoke-link";
import { whatsappWebhookRoute } from "./webhook";

export function whatsappRoutes(deps: AppDeps) {
  return new Elysia()
    .use(startWhatsAppLinkRoute(deps))
    .use(revokeWhatsAppLinkRoute(deps))
    .use(whatsappWebhookRoute(deps));
}
