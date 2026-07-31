import { Elysia } from 'elysia';
import { startBillingPortal } from '../../../../application/use-cases/billing/start-billing-portal';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { BILLING_ERRORS } from '../errors';
import {
  billingWorkspaceParamsSchema,
  startBillingPortalSchema,
} from '../schemas';

/** M5-05 — abre o Stripe Customer Portal hospedado (trocar plano, cancelar, atualizar cartão). Só o owner. */
export const startBillingPortalRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/workspaces/:workspaceId/billing/portal',
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
      const input = validateBody(startBillingPortalSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await startBillingPortal(
        deps,
        auth.value,
        input.value.returnUrl
      );
      return respond(set, result, BILLING_ERRORS, 200);
    }
  );
