export type AccountError =
  | 'invalid_bank_code'
  | 'account_not_found'
  | 'account_has_transactions'
  | 'csv_empty'
  | 'file_too_large'
  | 'category_not_found';
