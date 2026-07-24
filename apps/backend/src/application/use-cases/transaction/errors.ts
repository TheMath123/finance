export type TransactionError =
  | 'category_not_found'
  | 'account_not_found'
  | 'card_not_found'
  | 'transaction_not_found'
  | 'invalid_method_fields'
  | 'invoice_paid'
  | 'installment_field_locked';
