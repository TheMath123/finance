import { buildTransactionsCsv } from "../../../domain/services/transactions-csv";
import type { Actor, UseCaseDeps } from "../../deps";

/**
 * M2-11: export CSV de transações (portabilidade LGPD). Síncrono — o volume
 * real de um workspace de finanças pessoais não justifica job assíncrono
 * (confirmado no teste de performance do M2-08: mesmo 500 mil linhas num
 * workspace só respondem em ~27ms numa agregação; um SELECT simples com
 * ORDER BY é ainda mais barato).
 */
export async function exportTransactionsCsv(
  deps: Pick<UseCaseDeps, "repos">,
  actor: Actor,
): Promise<string> {
  const rows = await deps.repos.transaction.listForExport(actor.workspaceId);
  return buildTransactionsCsv(rows);
}
