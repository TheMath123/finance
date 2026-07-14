import { z } from "zod";

/** Envs do package db, validadas no boot — a aplicação não sobe com env inválida. */
const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .default("postgres://finance:finance@localhost:5432/finance"),
});

export const env = envSchema.parse(process.env);
