import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import { workspaceMembers, type Db } from "@finance/db";
import { verifyAccessToken } from "../../lib/tokens";
import { fail } from "../../lib/http";

/** Lista os workspaces do usuário autenticado (seletor do app). */
export function workspaceRoutes(deps: { db: Db; jwtSecret: string }) {
  return new Elysia().get("/workspaces", async ({ request, set }) => {
    const header = request.headers.get("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    const payload = token ? await verifyAccessToken(deps.jwtSecret, token) : null;
    if (!payload) {
      return fail(set, { status: 401, code: "unauthorized", message: "Autenticação necessária." });
    }

    const memberships = await deps.db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.userId, payload.userId),
      with: { workspace: true },
    });
    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      type: m.workspace.type,
      plan: m.workspace.plan,
      role: m.role,
    }));
  });
}
