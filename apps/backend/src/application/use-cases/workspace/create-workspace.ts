import { DEFAULT_CATEGORIES } from "@finance/db";
import type { Workspace } from "../../../domain/entities/workspace";
import type { UseCaseDeps } from "../../deps";

export interface CreateWorkspaceInput {
  name: string;
}

/**
 * Cria um workspace `family` (compartilhado) e já adiciona quem criou como owner.
 * Mesmo onboarding do registro (spec: "ao criar workspace, seed de categorias
 * padrão + criação guiada da primeira conta/cartão — nunca deixar o usuário
 * numa tela vazia"): categorias padrão + banco/conta zerados, pra já dar pra
 * lançar transação sem cadastro manual antes.
 * Limite de plano (free = 1 compartilhado por usuário) é checado em M2-03, não aqui.
 */
export async function createWorkspace(
  deps: UseCaseDeps,
  userId: string,
  input: CreateWorkspaceInput,
): Promise<Workspace> {
  return deps.uow.run(async (repos) => {
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
}
