import { Elysia } from "elysia";
import { z } from "zod";
import type { Db } from "@finance/db";
import { fail, parse, requireRole } from "../../lib/http";
import { monthlySummary } from "./service";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

/** Visão mensal: receitas, despesas, por categoria, saldo total e disponível projetado. */
export function summaryRoutes(deps: { db: Db; jwtSecret: string }) {
  return new Elysia({ prefix: "/workspaces/:workspaceId" }).get(
    "/summary",
    async ({ request, params, query, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "viewer");
      if (!auth.ok) return fail(set, auth.error);
      const q = parse(querySchema, query);
      if (!q.ok) return fail(set, q.error);
      return monthlySummary(deps, auth.value, q.value.year, q.value.month);
    },
  );
}
