import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "./env";
import * as schema from "./schema";

export function createDb(url: string = env.DATABASE_URL) {
  const client = postgres(url);
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
