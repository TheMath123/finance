import { ACCOUNT_TYPES, TRANSACTION_METHODS, TRANSACTION_TYPES } from "@finance/shared";
import { z } from "zod";

export const bankSchema = z.object({
  name: z.string().min(1, "Informe o nome").max(80),
  bankCode: z.string().min(1, "Selecione o banco"),
});
export type BankInput = z.infer<typeof bankSchema>;

export const accountSchema = z.object({
  name: z.string().min(1, "Informe o nome").max(80),
  bankId: z.string().uuid("Selecione o banco"),
  type: z.enum(ACCOUNT_TYPES, { error: "Selecione o tipo" }),
  /** Centavos (integer) — mesmo formato da API, nunca reais/float. */
  initialBalance: z.number().int(),
});
export type AccountInput = z.infer<typeof accountSchema>;

export const transactionSchema = z
  .object({
    description: z.string().min(1, "Informe a descrição").max(200),
    /** Centavos (integer) — mesmo formato da API, nunca reais/float. */
    amount: z.number().int().positive("Informe um valor maior que zero"),
    type: z.enum(TRANSACTION_TYPES, { error: "Selecione o tipo" }),
    method: z.enum(TRANSACTION_METHODS, { error: "Selecione o método" }),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    categoryId: z.string().uuid("Selecione a categoria"),
    accountId: z.string().uuid().optional(),
    cardId: z.string().uuid().optional(),
  })
  .refine((data) => data.accountId ?? data.cardId, {
    message: "Selecione uma conta ou cartão",
    path: ["accountId"],
  });
export type TransactionInput = z.infer<typeof transactionSchema>;
