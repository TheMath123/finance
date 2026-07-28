import {
  ACCOUNT_TYPES,
  RECURRENCE_FREQUENCIES,
  SAVED_FORMULA_DISPLAY_FORMATS,
  TRANSACTION_METHODS,
  TRANSACTION_TYPES,
} from '@finance/shared';
import { z } from 'zod';

/** Recorrência não permite "transfer" (fora do M1 — sem conta destino). */
const RECURRING_METHODS = TRANSACTION_METHODS.filter(
  (method) => method !== 'transfer'
) as Exclude<(typeof TRANSACTION_METHODS)[number], 'transfer'>[];

export const categorySchema = z.object({
  name: z.string().min(1, 'Informe o nome').max(60),
  icon: z.string().min(1, 'Informe um ícone').max(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Selecione uma cor'),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const accountSchema = z.object({
  name: z.string().min(1, 'Informe o nome').max(80),
  bankCode: z.string().min(1, 'Selecione o banco'),
  type: z.enum(ACCOUNT_TYPES, { error: 'Selecione o tipo' }),
  /** Centavos (integer) — mesmo formato da API, nunca reais/float. */
  initialBalance: z.number().int(),
});
export type AccountInput = z.infer<typeof accountSchema>;

export const transactionSchema = z
  .object({
    description: z.string().min(1, 'Informe a descrição').max(200),
    /** Centavos (integer) — mesmo formato da API, nunca reais/float. */
    amount: z.number().int().positive('Informe um valor maior que zero'),
    type: z.enum(TRANSACTION_TYPES, { error: 'Selecione o tipo' }),
    method: z.enum(TRANSACTION_METHODS, { error: 'Selecione o método' }),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
    categoryId: z.string().uuid('Selecione a categoria'),
    accountId: z.string().uuid().optional(),
    cardId: z.string().uuid().optional(),
    /** Só method=credit; select de 1x a 48x — string na UI (padrão dos demais
     * selects numéricos, ex. closingDay), convertida pra número ao enviar. */
    installments: z.string().optional(),
  })
  .refine((data) => data.accountId ?? data.cardId, {
    message: 'Selecione uma conta ou cartão',
    path: ['accountId'],
  });
export type TransactionInput = z.infer<typeof transactionSchema>;

/**
 * Edição de transação — descrição, valor, categoria e data são sempre
 * editáveis via PATCH; conta (não-crédito) e cartão (crédito avulsa, não
 * parcela) entram condicionalmente conforme o método da transação (ver
 * `EditTransactionForm`). Tipo/método nunca mudam depois de criada.
 */
export const editTransactionSchema = z.object({
  description: z.string().min(1, 'Informe a descrição').max(200),
  /** Centavos (integer) — mesmo formato da API, nunca reais/float. */
  amount: z.number().int().positive('Informe um valor maior que zero'),
  categoryId: z.string().uuid('Selecione a categoria'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  accountId: z.string().uuid().optional(),
  cardId: z.string().uuid().optional(),
});
export type EditTransactionInput = z.infer<typeof editTransactionSchema>;

export const cardSchema = z.object({
  name: z.string().min(1, 'Informe o nome').max(80),
  bankCode: z.string().min(1, 'Selecione o banco'),
  /** Centavos (integer) — mesmo formato da API, nunca reais/float. */
  limit: z.number().int().positive('Informe um limite maior que zero'),
  /** Select de 1 a 28 — string na UI, convertido para número ao enviar. */
  closingDay: z.string().min(1, 'Selecione o dia'),
  dueDay: z.string().min(1, 'Selecione o dia'),
});
export type CardInput = z.infer<typeof cardSchema>;

export const payInvoiceSchema = z.object({
  accountId: z.string().uuid('Selecione a conta'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  method: z.enum(['pix', 'debit'], { error: 'Selecione o método' }),
});
export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>;

export const recurringSchema = z
  .object({
    description: z.string().min(1, 'Informe a descrição').max(200),
    /** Centavos (integer) — mesmo formato da API, nunca reais/float. */
    amount: z.number().int().positive('Informe um valor maior que zero'),
    type: z.enum(TRANSACTION_TYPES, { error: 'Selecione o tipo' }),
    method: z.enum(RECURRING_METHODS, { error: 'Selecione o método' }),
    categoryId: z.string().uuid('Selecione a categoria'),
    accountId: z.string().uuid().optional(),
    cardId: z.string().uuid().optional(),
    frequency: z.enum(RECURRENCE_FREQUENCIES, {
      error: 'Selecione a frequência',
    }),
    /** Dia do mês (1-31) pra monthly/yearly, ou dia da semana 0-6 (domingo=0) pra weekly. */
    dayOfReference: z.number().int().min(0).max(31),
    monthOfReference: z.number().int().min(1).max(12).optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => data.accountId ?? data.cardId, {
    message: 'Selecione uma conta ou cartão',
    path: ['accountId'],
  });
export type RecurringInput = z.infer<typeof recurringSchema>;

export const createTransferSchema = z.object({
  /** Telefone ou e-mail de um usuário existente na plataforma. */
  recipient: z.string().min(3, 'Informe telefone ou e-mail'),
  /** Centavos (integer) — mesmo formato da API, nunca reais/float. */
  amount: z.number().int().positive('Informe um valor maior que zero'),
  description: z.string().min(1, 'Informe uma descrição').max(200),
  accountId: z.string().uuid('Selecione a conta de origem'),
});
export type CreateTransferInput = z.infer<typeof createTransferSchema>;

export const acceptTransferSchema = z.object({
  accountId: z.string().uuid('Selecione a conta de destino'),
  markTrusted: z.boolean().optional(),
});
export type AcceptTransferInput = z.infer<typeof acceptTransferSchema>;

/** Não é uma escolha única — a mesma fórmula pode virar widget na Home E em Transações ao mesmo tempo. */
export const savedFormulaSchema = z.object({
  name: z.string().min(1, 'Informe o nome').max(80),
  expression: z.string().min(1, 'Monte uma expressão').max(500),
  displayFormat: z.enum(SAVED_FORMULA_DISPLAY_FORMATS, {
    error: 'Selecione o formato',
  }),
  pinnedHome: z.boolean(),
  pinnedTransactions: z.boolean(),
});
export type SavedFormulaInput = z.infer<typeof savedFormulaSchema>;
