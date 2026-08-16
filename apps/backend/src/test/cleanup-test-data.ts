import { createDb, type Db } from '@finance/db';
import { sql } from 'drizzle-orm';
import { cleanupTestPlans } from './cleanup-test-plans';

/**
 * Sem banco de teste isolado (bun test roda contra o Postgres de dev — ver
 * cleanup-test-plans.ts), toda suite de *.test.ts cria usuários/workspaces
 * de verdade que ficam pra sempre no banco se ninguém limpar. Convenção
 * atual (ver `uniqueEmail` em cada *.test.ts): e-mail sempre termina em
 * `@test.local`. `TEST_EMAIL_PATTERNS` também cobre convenções antigas
 * (`@teste.invalido`, `@example.com`, `teste@teste.com`) encontradas numa
 * limpeza manual — domínios reservados/inválidos, nunca usados por conta
 * real, então seguros de reconhecer como dado de teste.
 *
 * Ordem importa por causa de FKs sem cascade:
 * 1. Zera `users.default_workspace_id` de quem aponta pra um workspace que
 *    vai ser apagado (de teste OU órfão, ver passo 6) — a FK pra workspaces
 *    não tem onDelete (bloquearia o passo 4 se não zerasse).
 * 2. Apaga `inter_user_transfers` envolvendo usuário de teste — as colunas
 *    de transação de lá (`from_transaction_id`/`to_transaction_id`) são
 *    `onDelete: 'restrict'` de propósito (a transferência liga workspaces
 *    de DOIS usuários diferentes, então uma transação não pode arrastar a
 *    outra ponta junto), e `from_transaction_id` nem é nullable — só dá
 *    pra tirar o bloqueio apagando a linha inteira, não zerando a FK.
 * 3. Zera `split_shares.reimbursement_transaction_id` que aponta pra uma
 *    transação de workspace de teste — mesma ideia (FK `restrict`, mas
 *    esta é nullable), o reembolso de uma divisão de despesa pode viver no
 *    workspace de OUTRO participante e nunca deve sumir só porque a
 *    despesa original foi apagada.
 * 4. Apaga os workspaces onde algum membro é usuário de teste (cascade
 *    cuida de bank_accounts/cards/transactions/categorias/recorrências/
 *    faturas/notificações/etc. — todo FK workspace-scoped é
 *    onDelete: 'cascade', ver packages/db/src/schema).
 * 5. Apaga os próprios usuários de teste (cascade cuida de
 *    refresh_tokens/oauth_accounts/push_tokens/etc.).
 * 6. Apaga workspaces ÓRFÃOS (zero linhas em workspace_members) — não é
 *    dado de teste por convenção de e-mail, é lixo de qualquer origem
 *    (script de carga, fluxo interrompido no meio, etc.): sem nenhum
 *    membro, a aplicação nunca consegue enxergar/acessar esse workspace de
 *    novo, então não tem risco de apagar algo alcançável.
 * 7. Reaproveita `cleanupTestPlans` pros planos de catálogo criados fora do
 *    fluxo usuário→workspace (billing.test.ts, admin-plans.test.ts) — esses
 *    dois arquivos já chamam isso no próprio `afterAll`, mas rodar de novo
 *    aqui é inofensivo (idempotente) e cobre o caso de a suite ter sido
 *    abortada antes do `afterAll` daquele arquivo específico rodar.
 * 8. Apaga feature flags criadas por admin.test.ts (`test-flag-<hex>`,
 *    `is_system: false`) — tabela catálogo isolada, sem FK de ninguém pra
 *    destravar antes.
 */
const TEST_EMAIL_PATTERNS = [
  '%@test.local',
  '%@teste.invalido',
  '%@example.com',
  'teste@teste.com',
];

export async function cleanupTestData(db: Db): Promise<void> {
  const emailMatch = sql.join(
    TEST_EMAIL_PATTERNS.map((pattern) => sql`email LIKE ${pattern}`),
    sql` OR `
  );
  const testUserIds = sql`(SELECT id FROM users WHERE ${emailMatch})`;
  // União de "workspace de usuário de teste" com "workspace órfão" — os dois
  // passam pela mesma sequência de destravamento de FK antes do DELETE.
  const doomedWorkspaceIds = sql`(
    SELECT DISTINCT wm.workspace_id FROM workspace_members wm WHERE wm.user_id IN ${testUserIds}
    UNION
    SELECT w.id FROM workspaces w
    WHERE NOT EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = w.id)
  )`;

  await db.execute(sql`
    UPDATE users SET default_workspace_id = NULL
    WHERE default_workspace_id IN ${doomedWorkspaceIds}
  `);

  await db.execute(sql`
    DELETE FROM inter_user_transfers
    WHERE from_user_id IN ${testUserIds} OR to_user_id IN ${testUserIds}
  `);

  await db.execute(sql`
    UPDATE split_shares SET reimbursement_transaction_id = NULL
    WHERE reimbursement_transaction_id IN (
      SELECT id FROM transactions WHERE workspace_id IN ${doomedWorkspaceIds}
    )
  `);

  await db.execute(
    sql`DELETE FROM workspaces WHERE id IN ${doomedWorkspaceIds}`
  );

  await db.execute(sql`DELETE FROM users WHERE ${emailMatch}`);

  await cleanupTestPlans(
    db,
    ['test-plan-', 'test-billing-plan-'],
    ['test-plans-', 'test-billing-']
  );

  await db.execute(
    sql`DELETE FROM feature_flags WHERE key LIKE 'test-flag-%' AND is_system = false`
  );
}

// Executável direto (`bun run src/test/cleanup-test-data.ts`) além de rodar
// como `posttest` — ver apps/backend/package.json.
if (import.meta.main) {
  const db = createDb();
  await cleanupTestData(db);
  console.log('[cleanup-test-data] limpeza do banco local concluída.');
  process.exit(0);
}
