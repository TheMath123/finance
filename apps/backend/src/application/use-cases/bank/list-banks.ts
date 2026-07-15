import type { Bank } from "../../../domain/entities/bank";
import type { Actor, UseCaseDeps } from "../../deps";

export async function listBanks(deps: UseCaseDeps, actor: Actor): Promise<Bank[]> {
  return deps.repos.bank.listByWorkspace(actor.workspaceId);
}
