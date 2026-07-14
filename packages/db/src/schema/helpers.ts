import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

/** PK UUIDv7 gerada pelo Postgres 18 (`uuidv7()`) — ordenável por tempo, sem gerador na aplicação. */
export const id = () => uuid("id").primaryKey().default(sql`uuidv7()`);

export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
