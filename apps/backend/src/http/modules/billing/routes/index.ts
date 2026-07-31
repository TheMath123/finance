import { Elysia } from 'elysia';
import type { AppDeps } from '../../../deps';
import { startCheckoutRoute } from './checkout';
import { listAvailablePlansRoute } from './plans';
import { startBillingPortalRoute } from './portal';
import { getBillingStatusRoute } from './status';
import { stripeWebhookRoute } from './webhook';

export function billingRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listAvailablePlansRoute(deps))
    .use(getBillingStatusRoute(deps))
    .use(startCheckoutRoute(deps))
    .use(startBillingPortalRoute(deps))
    .use(stripeWebhookRoute(deps));
}
