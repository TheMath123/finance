import type { Db } from '@finance/db';
import { sql } from 'drizzle-orm';

/**
 * Sem banco de teste isolado (bun test roda contra o Postgres de dev — ver
 * spec.md, "Infra local via docker compose"), planos criados em teste ficam
 * pra sempre no catálogo real se ninguém limpar. Apaga por prefixo de key:
 * desvincula default_workspace_id de usuários de teste antes (FK bloqueia
 * senão), apaga os workspaces presos ao plano (cascade cuida do resto:
 * bank_accounts/cards/transactions/etc.), o plano em si (cascade cuida de
 * plan_prices) e, por fim, os próprios usuários de teste pelo prefixo do
 * e-mail.
 */
export async function cleanupTestPlans(
  db: Db,
  planKeyPrefixes: string[],
  userEmailPrefixes: string[]
): Promise<void> {
  for (const prefix of planKeyPrefixes) {
    const pattern = `${prefix}%`;
    await db.execute(sql`
      UPDATE users SET default_workspace_id = NULL
      WHERE default_workspace_id IN (
        SELECT w.id FROM workspaces w
        JOIN plans p ON p.id = w.plan_id
        WHERE p.key LIKE ${pattern}
      )
    `);
    await db.execute(sql`
      DELETE FROM workspaces
      WHERE plan_id IN (SELECT id FROM plans WHERE key LIKE ${pattern})
    `);
    await db.execute(sql`DELETE FROM plans WHERE key LIKE ${pattern}`);
  }

  for (const prefix of userEmailPrefixes) {
    await db.execute(sql`DELETE FROM users WHERE email LIKE ${`${prefix}%`}`);
  }
}
