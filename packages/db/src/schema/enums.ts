import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Enums compartilhados por mais de um model (transaction + recurring-transaction),
 * em arquivo próprio para evitar import circular entre os arquivos de model.
 */
export const transactionTypeEnum = pgEnum('transaction_type', [
  'income',
  'expense',
]);
export const transactionMethodEnum = pgEnum('transaction_method', [
  'pix',
  'debit',
  'cash',
  'credit',
  'transfer',
]);
