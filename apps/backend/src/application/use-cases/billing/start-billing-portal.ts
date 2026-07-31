import { type Either, left, right } from '@finance/shared';
import type { Actor, UseCaseDeps } from '../../deps';
import type { BillingError } from './errors';

/**
 * M5-05 — abre o Stripe Customer Portal hospedado (trocar plano, cancelar,
 * atualizar cartão) pro owner do workspace que já tem assinatura. Sem
 * `stripeCustomerId` significa que o workspace nunca passou por um
 * checkout — não tem o que gerenciar.
 */
export async function startBillingPortal(
  deps: Pick<UseCaseDeps, 'repos' | 'payments'>,
  actor: Actor,
  returnUrl: string
): Promise<Either<BillingError, { portalUrl: string }>> {
  const workspace = await deps.repos.workspace.findById(actor.workspaceId);
  if (!workspace?.stripeCustomerId) return left('no_active_subscription');

  const { url } = await deps.payments.createBillingPortalSession({
    customerId: workspace.stripeCustomerId,
    returnUrl,
  });

  return right({ portalUrl: url });
}
