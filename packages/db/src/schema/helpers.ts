import { sql } from 'drizzle-orm';
import { customType, timestamp, uuid } from 'drizzle-orm/pg-core';

/** PK UUIDv7 gerada pelo Postgres 18 (`uuidv7()`) — ordenável por tempo, sem gerador na aplicação. */
export const id = () => uuid('id').primaryKey().default(sql`uuidv7()`);

export const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/**
 * Coluna `tsvector` do Postgres — Drizzle não tem builder nativo pra ela,
 * então é um `customType` fino (só o tipo SQL; nunca mapeada/lida no app).
 * Usada só como coluna gerada (`.generatedAlwaysAs(...)`) alimentando busca
 * full-text (ver `apps/backend/src/infra/db/full-text-search.ts`) — nunca
 * ILIKE, que não usa índice em padrões com `%` à esquerda.
 */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});
