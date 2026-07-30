import { type Either, left, right } from '@finance/shared';
import type { Workspace } from '../../../domain/entities/workspace';
import type { UseCaseDeps } from '../../deps';
import type { WorkspaceError } from './errors';

export interface CreateWorkspaceInput {
  name: string;
}

/**
 * Cria um workspace `family` (compartilhado) e já adiciona quem criou como owner.
 * Mesmo onboarding do registro (spec: "ao criar workspace, seed de categorias
 * padrão + criação guiada da primeira conta/cartão — nunca deixar o usuário
 * numa tela vazia"): categorias padrão + banco/conta zerados, pra já dar pra
 * lançar transação sem cadastro manual antes.
 *
 * Enforcement de plano (M2-03, migrado pro M5-02): limite vem do plano
 * atual de cada workspace já possuído (dado real da tabela `plans`, não
 * mais constante hardcoded). Workspace novo sempre nasce no plano `free`
 * (não existe fluxo de criar já num plano pago — cobrança é milestone
 * futuro, M5-03).
 */
export async function createWorkspace(
  deps: UseCaseDeps,
  userId: string,
  input: CreateWorkspaceInput
): Promise<Either<WorkspaceError, Workspace>> {
  const freePlan = await deps.repos.plan.findByKey('free');
  if (!freePlan) throw new Error('plano free não encontrado');

  const memberships = await deps.repos.workspace.listByUser(userId);
  const ownedSharedOnFreePlan = memberships.filter(
    (m) =>
      m.role === 'owner' &&
      m.workspace.type !== 'personal' &&
      m.workspace.planId === freePlan.id
  );
  if (
    ownedSharedOnFreePlan.length >= freePlan.limits.maxOwnedSharedWorkspaces
  ) {
    return left('plan_limit_reached');
  }

  const freePlanPrice =
    freePlan.prices.find((p) => p.isDefault) ?? freePlan.prices[0];

  const workspace = await deps.uow.run(async (repos) => {
    const workspace = await repos.workspace.create({
      name: input.name,
      type: 'family',
      planId: freePlan.id,
      planPriceId: freePlanPrice?.id,
    });
    await repos.workspace.addMember({
      workspaceId: workspace.id,
      userId,
      role: 'owner',
    });

    const defaultCategories = await repos.defaultCategory.list();
    await repos.category.createMany(
      workspace.id,
      defaultCategories.map((c) => ({
        name: c.name,
        icon: c.icon,
        color: c.color,
        isFallback: c.isFallback,
        isDefault: true,
      }))
    );

    const bank = await repos.bank.create(workspace.id, {
      name: 'Minha carteira',
      bankCode: 'other',
    });
    await repos.account.create(workspace.id, {
      name: 'Conta principal',
      bankId: bank.id,
      type: 'checking',
      initialBalance: 0,
    });

    await repos.audit.record({
      workspaceId: workspace.id,
      userId,
      action: 'create',
      entity: 'workspace',
      entityId: workspace.id,
    });
    return workspace;
  });

  return right(workspace);
}
