import { z } from "zod";

/**
 * Espelha os schemas de apps/backend/src/http/modules/auth/schemas.ts.
 * TODO: mover para packages/shared quando o backend expuser schemas de auth
 * reutilizáveis entre app e API (spec: Zod compartilhado "quando fizer sentido").
 */
export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Informe seu nome").max(120),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(128),
  termsAccepted: z.boolean().refine((v) => v, { message: "aceite dos termos é obrigatório" }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
