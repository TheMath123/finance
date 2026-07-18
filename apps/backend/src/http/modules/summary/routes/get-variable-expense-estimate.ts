import { Elysia } from "elysia";
import { estimateVariableExpense } from "../../../../application/use-cases/summary";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateParams } from "../../../validate";
import { workspaceParamsSchema } from "../schemas";

/**
 * Estimativa de gasto variável por categoria (M2-08) — média dos últimos 3
 * meses completos, tela separada no app (não faz parte do resumo mensal por
 * mês específico, é sempre a mesma janela móvel).
 */
export const getVariableExpenseEstimateRoute = (deps: AppDeps) =>
  new Elysia().get(
    "/workspaces/:workspaceId/summary/variable-expense-estimate",
    async ({ request, params, set }) => {
      const p = validateParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "viewer");
      if (!auth.ok) return fail(set, auth.error);
      return estimateVariableExpense(deps, auth.value);
    },
  );
