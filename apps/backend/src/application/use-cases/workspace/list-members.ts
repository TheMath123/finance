import type { Actor, UseCaseDeps } from "../../deps";
import type { WorkspaceMemberView } from "../../ports/workspace-repository";

export function listMembers(
  deps: Pick<UseCaseDeps, "repos">,
  actor: Actor,
): Promise<WorkspaceMemberView[]> {
  return deps.repos.workspace.listMembers(actor.workspaceId);
}
