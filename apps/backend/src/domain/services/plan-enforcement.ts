import type { UseCaseDeps } from '../../application/deps';
import type { Workspace } from '../entities/workspace';
import { resolveEffectivePlan } from './resolve-effective-plan';

export interface WorkspaceQuota {
  /** Quota efetiva de workspaces compartilhados — maior limite entre os planos efetivos já possuídos, nunca menor que o do free. */
  quota: number;
  /** Workspaces compartilhados que o dono possui, do mais antigo pro mais novo. */
  ownedShared: Workspace[];
}

/**
 * Calcula a quota efetiva de workspaces compartilhados de um dono — mesma
 * regra usada em `create-workspace.ts` (bloqueia criar workspace novo além
 * da quota) e aqui, em `isWorkspaceOverQuota` (bloqueia interação com
 * workspace já existente que ficou acima da quota depois de um downgrade).
 * Upgrade em QUALQUER workspace já possuído libera slot pra conta toda; o
 * plano efetivo de cada um usa `resolveEffectivePlan` (trial vencido/
 * assinatura cancelada caem pro free), então um trial premium não infla a
 * quota pra sempre.
 */
export async function computeOwnedWorkspaceQuota(
  deps: Pick<UseCaseDeps, 'repos'>,
  ownerId: string
): Promise<WorkspaceQuota> {
  const freePlan = await deps.repos.plan.findByKey('free');
  if (!freePlan) throw new Error('plano free não encontrado');

  const memberships = await deps.repos.workspace.listByUser(ownerId);
  const ownedShared = memberships
    .filter((m) => m.role === 'owner' && m.workspace.type !== 'personal')
    .map((m) => m.workspace)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const effectivePlans = await Promise.all(
    ownedShared.map((w) => resolveEffectivePlan(deps, w))
  );
  const quota = effectivePlans.reduce(
    (max, plan) => Math.max(max, plan?.limits.maxOwnedSharedWorkspaces ?? 0),
    freePlan.limits.maxOwnedSharedWorkspaces
  );
  return { quota, ownedShared };
}

/**
 * Um workspace específico está acima da quota do dono (excedente) — os N
 * mais antigos (N = quota efetiva) continuam ativos, este aqui nasceu
 * depois da quota já ter sido atingida (ou passou a valer menos após um
 * downgrade/cancelamento em outro workspace). Nunca aplica a workspace
 * `personal` — esses não entram na contagem em nenhum lugar.
 */
export async function isWorkspaceOverQuota(
  deps: Pick<UseCaseDeps, 'repos'>,
  workspace: Workspace
): Promise<boolean> {
  if (workspace.type === 'personal') return false;
  const ownerId = await deps.repos.workspace.findOwnerUserId(workspace.id);
  if (!ownerId) return false;
  const { quota, ownedShared } = await computeOwnedWorkspaceQuota(
    deps,
    ownerId
  );
  const rank = ownedShared.findIndex((w) => w.id === workspace.id);
  if (rank === -1) return false;
  return rank >= quota;
}

/**
 * Um membro específico está acima do limite de membros do plano efetivo
 * do workspace — os que entraram primeiro (por `createdAt` do vínculo)
 * continuam com acesso normal, os que entraram depois do limite já
 * atingido (ou passaram a valer excedentes após um downgrade) viram só
 * leitura. O dono nunca perde acesso por essa checagem sozinha (ver
 * `requireWorkspaceRole`, que nunca rebaixa quem é `owner`).
 */
export async function isMembershipOverQuota(
  deps: Pick<UseCaseDeps, 'repos'>,
  workspace: Workspace,
  userId: string
): Promise<boolean> {
  const plan = await resolveEffectivePlan(deps, workspace);
  if (!plan) return false;
  const members = await deps.repos.workspace.listMembers(workspace.id);
  const sorted = [...members].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
  const rank = sorted.findIndex((m) => m.userId === userId);
  if (rank === -1) return false;
  return rank >= plan.limits.maxMembersPerWorkspace;
}
