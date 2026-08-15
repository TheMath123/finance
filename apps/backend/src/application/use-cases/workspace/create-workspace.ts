import { type Either, left, right } from '@finance/shared';
import type { Workspace } from '../../../domain/entities/workspace';
import { computeOwnedWorkspaceQuota } from '../../../domain/services/plan-enforcement';
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
 * Enforcement de plano (M2-03, migrado pro M5-02, revisado pro modelo
 * "1 plano por workspace" pós-M5-05): como o plano é atribuído por
 * workspace mas "quantos workspaces posso ter" é uma pergunta sobre a
 * conta inteira, a quota efetiva é o MAIOR `maxOwnedSharedWorkspaces`
 * entre os planos efetivos (via `resolveEffectivePlan` — já cai pro free
 * se trial venceu ou assinatura foi cancelada, fechando a brecha de trial
 * premium inflar a quota pra sempre) de todos os workspaces compartilhados
 * que o usuário já possui como owner; a contagem é o total desses
 * workspaces, sem filtrar por plano. Ou seja: fazer upgrade de QUALQUER
 * um dos workspaces já possuídos libera slot pra conta toda — o workspace
 * novo em si sempre nasce no plano `free` (não existe fluxo de criar já
 * num plano pago).
 *
 * Workspace criado além da quota (ex.: dono já tinha o máximo e um dos
 * workspaces que garantia o slot extra caiu de plano) nunca é apagado —
 * só perde a interação (vira só leitura), ver `requireWorkspaceRole` +
 * `isWorkspaceOverQuota`. Aqui só bloqueia a criação de um novo além dela.
 */
export async function createWorkspace(
  deps: UseCaseDeps,
  userId: string,
  input: CreateWorkspaceInput
): Promise<Either<WorkspaceError, Workspace>> {
  const freePlan = await deps.repos.plan.findByKey('free');
  if (!freePlan) throw new Error('plano free não encontrado');

  const { quota, ownedShared } = await computeOwnedWorkspaceQuota(deps, userId);
  if (ownedShared.length >= quota) {
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
