import { DEFAULT_CATEGORIES } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { FREE_PLAN_LIMITS } from "../../../domain/services/plan-limits";
import type { Workspace } from "../../../domain/entities/workspace";
import type { UseCaseDeps } from "../../deps";
import type { WorkspaceError } from "./errors";

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
 * Enforcement de plano (M2-03): free = no máximo 1 workspace compartilhado
 * por usuário (contando só os que ele possui/criou — ser convidado pro
 * workspace de outra pessoa não consome a cota). Workspace novo sempre nasce
 * `free` (não existe fluxo de criar já `premium` — cobrança é milestone futuro).
 */
export async function createWorkspace(
  deps: UseCaseDeps,
  userId: string,
  input: CreateWorkspaceInput,
): Promise<Either<WorkspaceError, Workspace>> {
  const memberships = await deps.repos.workspace.listByUser(userId);
  const ownedSharedFree = memberships.filter(
    (m) => m.role === "owner" && m.workspace.type !== "personal" && m.workspace.plan === "free",
  );
  if (ownedSharedFree.length >= FREE_PLAN_LIMITS.maxOwnedSharedWorkspaces) {
    return left("plan_limit_reached");
  }

  const workspace = await deps.uow.run(async (repos) => {
    const workspace = await repos.workspace.create({ name: input.name, type: "family" });
    await repos.workspace.addMember({ workspaceId: workspace.id, userId, role: "owner" });

    await repos.category.createMany(
      workspace.id,
      DEFAULT_CATEGORIES.map((c) => ({
        name: c.name,
        icon: c.icon,
        color: c.color,
        isFallback: c.isFallback ?? false,
        isDefault: true,
      })),
    );

    const bank = await repos.bank.create(workspace.id, { name: "Minha carteira", bankCode: "other" });
    await repos.account.create(workspace.id, {
      name: "Conta principal",
      bankId: bank.id,
      type: "checking",
      initialBalance: 0,
    });

    await repos.audit.record({
      workspaceId: workspace.id,
      userId,
      action: "create",
      entity: "workspace",
      entityId: workspace.id,
    });
    return workspace;
  });

  return right(workspace);
}
