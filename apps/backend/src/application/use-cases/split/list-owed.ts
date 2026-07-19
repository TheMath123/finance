import type { OwedByMeView, OwedToMeView } from "../../ports/split-share-repository";
import type { UseCaseDeps } from "../../deps";

/** O que o usuário deve — participante em splits de outros. */
export function listOwedByMe(
  deps: Pick<UseCaseDeps, "repos">,
  actor: { userId: string },
): Promise<OwedByMeView[]> {
  return deps.repos.splitShare.listOwedByUser(actor.userId);
}

/** O que devem ao usuário — splits que ele criou, ainda não confirmados. */
export function listOwedToMe(
  deps: Pick<UseCaseDeps, "repos">,
  actor: { userId: string },
): Promise<OwedToMeView[]> {
  return deps.repos.splitShare.listOwedToCreator(actor.userId);
}
