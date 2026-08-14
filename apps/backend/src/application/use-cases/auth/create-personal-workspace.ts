import type { Repositories } from '../../ports/repositories';

/**
 * Workspace "Pessoal" + membership de owner + categorias padrão + banco e
 * conta de partida — tudo que um usuário novo precisa pra já conseguir
 * lançar uma transação sem cadastrar nada manualmente antes. Extraído de
 * `register.ts` pra ser reaproveitado por `google-sign-in.ts` (mesmo
 * onboarding, independente de como a conta foi criada). Sempre chamado de
 * dentro de um `deps.uow.run(...)` — `repos` aqui é o transacional, não
 * `deps.repos` direto.
 */
export async function createPersonalWorkspace(
  repos: Repositories,
  userId: string
): Promise<{ workspaceId: string }> {
  const freePlan = await repos.plan.findByKey('free');
  if (!freePlan) throw new Error('plano free não encontrado');
  const freePlanPrice =
    freePlan.prices.find((p) => p.isDefault) ?? freePlan.prices[0];

  const workspace = await repos.workspace.create({
    name: 'Pessoal',
    type: 'personal',
    planId: freePlan.id,
    planPriceId: freePlanPrice?.id,
  });
  await repos.user.setDefaultWorkspace(userId, workspace.id);
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

  // Banco + conta padrão — usuário começa com algo pra lançar transação sem
  // precisar cadastrar banco/conta manualmente primeiro.
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

  return { workspaceId: workspace.id };
}
