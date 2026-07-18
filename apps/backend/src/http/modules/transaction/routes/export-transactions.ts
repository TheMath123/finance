import { Elysia } from "elysia";
import { exportTransactionsCsv } from "../../../../application/use-cases/transaction";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateParams } from "../../../validate";
import { workspaceParamsSchema } from "../schemas";

/**
 * Export CSV de transações (M2-11, portabilidade LGPD) — dado sensível do
 * workspace inteiro, exige papel admin/owner (spec).
 */
export const exportTransactionsRoute = (deps: AppDeps) =>
  new Elysia().get(
    "/workspaces/:workspaceId/export.csv",
    async ({ request, params, set }) => {
      const p = validateParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);

      const csv = await exportTransactionsCsv(deps, auth.value);
      set.headers["Content-Type"] = "text/csv; charset=utf-8";
      set.headers["Content-Disposition"] = 'attachment; filename="transacoes.csv"';
      return csv;
    },
  );
