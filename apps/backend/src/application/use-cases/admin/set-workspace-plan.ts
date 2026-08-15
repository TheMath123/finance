import { type Either, left, right } from '@finance/shared';
import type { Workspace } from '../../../domain/entities/workspace';
import type { UseCaseDeps } from '../../deps';
import type { Plan } from '../../ports/plan-repository';
import type { AdminError } from './errors';

const DAY_MS = 24 * 60 * 60 * 1000;
const STRIPE_ACTIVE_STATUSES = ['trialing', 'active', 'past_due'];

/**
 * Atribui `plan`/`planPriceId` a um workspace, calcula trial, cancela
 * assinatura Stripe ativa quando o plano vinculado é privado, e grava o
 * audit log — tudo dentro de uma única transação. Qualquer workspace pode
 * receber qualquer plano (público ou privado) — o superadmin é quem decide
 * isso manualmente aqui, sem restrição de vínculo prévio.
 */
export async function assignPlanToWorkspace(
  deps: Pick<UseCaseDeps, 'repos' | 'uow' | 'payments'>,
  adminUserId: string,
  workspace: Workspace,
  plan: Plan,
  planPriceId?: string
): Promise<Either<AdminError, Workspace>> {
  let resolvedPriceId: string | null = null;
  if (planPriceId) {
    const price = await deps.repos.plan.findPriceById(planPriceId);
    if (!price || price.planId !== plan.id) return left('plan_price_not_found');
    resolvedPriceId = price.id;
  } else {
    const defaultPrice = plan.prices.find((p) => p.isDefault) ?? plan.prices[0];
    resolvedPriceId = defaultPrice?.id ?? null;
  }

  const isPlanChange = workspace.planId !== plan.id;
  const trialEndsAt = isPlanChange
    ? plan.trialDays > 0
      ? new Date(Date.now() + plan.trialDays * DAY_MS)
      : null
    : workspace.trialEndsAt;

  // Plano privado sendo vinculado: se o workspace já tinha assinatura
  // Stripe ativa, cancela na hora — passa a ser gerenciado 100% manualmente.
  // Cancelamento roda antes da transação (chamada de rede, nunca dentro do
  // `uow.run`) — se falhar, nada no banco muda ainda.
  const shouldCancelStripe =
    plan.isPrivate &&
    !!workspace.stripeSubscriptionId &&
    STRIPE_ACTIVE_STATUSES.includes(workspace.subscriptionStatus);
  if (shouldCancelStripe && workspace.stripeSubscriptionId) {
    await deps.payments.cancelSubscription({
      subscriptionId: workspace.stripeSubscriptionId,
    });
  }

  const updated = await deps.uow.run(async (repos) => {
    let result = await repos.workspace.updatePlan(workspace.id, {
      planId: plan.id,
      planPriceId: resolvedPriceId,
      trialEndsAt,
    });

    if (shouldCancelStripe) {
      result = await repos.workspace.updateSubscriptionState(workspace.id, {
        subscriptionStatus: 'canceled',
        stripeSubscriptionId: null,
        cancelAtPeriodEnd: false,
      });
    }

    await repos.adminAudit.record({
      adminUserId,
      action: 'set_workspace_plan',
      entity: 'workspace',
      entityId: workspace.id,
      metadata: {
        fromPlanId: workspace.planId,
        toPlanId: plan.id,
        planPriceId: resolvedPriceId,
      },
    });
    return result;
  });

  return right(updated);
}

/**
 * Controle manual do plano de um workspace pelo superadmin (M5-02) — hoje é
 * a única forma de mudar plano fora do fluxo de cobrança (que ainda não
 * existe). M5-03: também aceita escolher a opção de cobrança (`planPriceId`,
 * se omitido usa a marcada `isDefault` do plano) e, ao trocar de plano pra
 * um com `trialDays > 0`, inicia um novo trial (`trialEndsAt`); trocar pra um
 * plano sem trial, ou reatribuir o mesmo plano, não mexe no trial atual.
 */
export async function setWorkspacePlan(
  deps: Pick<UseCaseDeps, 'repos' | 'uow' | 'payments'>,
  adminUserId: string,
  workspaceId: string,
  planId: string,
  planPriceId?: string
): Promise<Either<AdminError, Workspace>> {
  const workspace = await deps.repos.workspace.findById(workspaceId);
  if (!workspace) return left('workspace_not_found');

  const plan = await deps.repos.plan.findById(planId);
  if (!plan) return left('plan_not_found');

  return assignPlanToWorkspace(deps, adminUserId, workspace, plan, planPriceId);
}
