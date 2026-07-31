import { Elysia } from 'elysia';
import { startCheckout } from '../../../../application/use-cases/billing/start-checkout';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { BILLING_ERRORS } from '../errors';
import { billingWorkspaceParamsSchema, startCheckoutSchema } from '../schemas';

/** M5-05 — inicia o Stripe Checkout hospedado. Só o owner do workspace pode assinar em nome dele. */
export const startCheckoutRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/workspaces/:workspaceId/billing/checkout',
    async ({ request, params, body, set }) => {
      const p = validateParams(billingWorkspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'owner'
      );
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(startCheckoutSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await startCheckout(deps, auth.value, input.value);
      return respond(set, result, BILLING_ERRORS, 200);
    }
  );
