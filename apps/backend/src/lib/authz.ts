import { and, eq } from "drizzle-orm";
import { workspaceMembers, type Db } from "@finance/db";
import type { WorkspaceRole } from "@finance/shared";

/**
 * Autorização por workspace (spec: toda operação valida membership + papel).
 * owner > admin > member > viewer.
 */
const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export function roleAtLeast(role: WorkspaceRole, min: WorkspaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export async function getMembership(
  db: Db,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRole | null> {
  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId),
    ),
  });
  return member?.role ?? null;
}
