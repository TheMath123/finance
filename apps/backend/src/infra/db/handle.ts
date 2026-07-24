import type { Db } from '@finance/db';

/**
 * Handle estrutural aceito pelos repositórios: tanto o client raiz quanto a
 * transação do Drizzle satisfazem este shape — é o que permite o Unit of Work.
 */
export type DbHandle = Pick<
  Db,
  'select' | 'insert' | 'update' | 'delete' | 'query'
>;
