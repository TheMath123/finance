import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse, parseParams, requireRole } from "../../../lib/http";
import { monthQuerySchema, workspaceParamsSchema } from "../schemas";
import { monthlySummary } from "../services/monthly-summary";

/** Visão mensal: receitas, despesas, por categoria, saldo total e disponível projetado. */
export const getSummaryRoute = (deps: AppDeps) =>
  new Elysia().get("/workspaces/:workspaceId/summary", async ({ request, params, query, set }) => {
    const p = parseParams(workspaceParamsSchema, params);
    if (!p.ok) return fail(set, p.error);
    const auth = await requireRole(deps, request, p.value.workspaceId, "viewer");
    if (!auth.ok) return fail(set, auth.error);
    const q = parse(monthQuerySchema, query);
    if (!q.ok) return fail(set, q.error);
    return monthlySummary(deps, auth.value, q.value.year, q.value.month);
  });
