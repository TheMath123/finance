import { Elysia } from 'elysia';
import { getBillingStatus } from '../../../../application/use-cases/billing/get-billing-status';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail } from '../../../http-error';
import { validateParams } from '../../../validate';
import { billingWorkspaceParamsSchema } from '../schemas';

/** M5-05 — qualquer membro pode ver o status de cobrança do workspace (agir é owner-only, ver checkout/portal). */
export const getBillingStatusRoute = (deps: AppDeps) =>
  new Elysia().get(
    '/workspaces/:workspaceId/billing',
    async ({ request, params, set }) => {
      const p = validateParams(billingWorkspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'viewer'
      );
      if (!auth.ok) return fail(set, auth.error);
      const status = await getBillingStatus(deps, auth.value);
      if (!status) {
        set.status = 404;
        return {
          error: { code: 'not_found', message: 'Workspace não encontrado.' },
        };
      }
      return status;
    }
  );
