export type CardError =
  | "invalid_bank_code"
  | "card_not_found"
  | "card_has_transactions"
  | "invoice_not_found"
  | "invoice_already_paid"
  | "invoice_empty"
  | "account_not_found";
